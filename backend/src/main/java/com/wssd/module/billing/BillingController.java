package com.wssd.module.billing;

import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import com.wssd.module.auth.User;
import com.wssd.module.auth.UserRepository;
import com.wssd.module.billing.dto.CheckoutRequest;
import com.wssd.module.billing.dto.CheckoutResponse;
import jakarta.annotation.PostConstruct;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {

    @Value("${stripe.secret-key}")
    private String stripeSecretKey;

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    @Value("${stripe.pro-price-id}")
    private String proPriceId;

    @Value("${stripe.enterprise-price-id}")
    private String enterprisePriceId;

    private final UserRepository userRepository;

    @PostConstruct
    void init() {
        Stripe.apiKey = stripeSecretKey;
    }

    // POST /api/billing/checkout  (requires auth)
    @PostMapping("/checkout")
    public Mono<ResponseEntity<CheckoutResponse>> createCheckout(
            @Valid @RequestBody CheckoutRequest req,
            @AuthenticationPrincipal UserDetails principal) {

        return Mono.fromCallable(() -> {
            String priceId = switch (req.plan()) {
                case "pro"        -> proPriceId;
                case "enterprise" -> enterprisePriceId;
                default -> throw new IllegalArgumentException("Unknown plan: " + req.plan());
            };

            User user = userRepository.findByEmail(principal.getUsername())
                    .orElseThrow(() -> new IllegalStateException("User not found"));

            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                    .setCustomerEmail(user.getEmail())
                    .setSuccessUrl("https://wssd.app/dashboard?checkout=success")
                    .setCancelUrl("https://wssd.app/pricing?checkout=cancelled")
                    .putMetadata("userId", user.getId().toString())
                    .addLineItem(
                        SessionCreateParams.LineItem.builder()
                            .setPrice(priceId)
                            .setQuantity(1L)
                            .build()
                    )
                    .build();

            Session session = Session.create(params);
            return ResponseEntity.ok(new CheckoutResponse(session.getUrl()));

        }).onErrorResume(IllegalArgumentException.class, e ->
                Mono.just(ResponseEntity.badRequest().<CheckoutResponse>build()))
          .onErrorResume(StripeException.class, e -> {
              log.error("Stripe error creating checkout: {}", e.getMessage());
              return Mono.just(ResponseEntity.status(HttpStatus.BAD_GATEWAY).<CheckoutResponse>build());
          });
    }

    // POST /api/billing/webhook  (public — signed by Stripe)
    @PostMapping("/webhook")
    public Mono<ResponseEntity<Void>> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        return Mono.fromCallable(() -> {
            Event event;
            try {
                event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
            } catch (SignatureVerificationException e) {
                log.warn("Invalid Stripe webhook signature");
                return ResponseEntity.<Void>status(HttpStatus.BAD_REQUEST).build();
            }

            switch (event.getType()) {
                case "checkout.session.completed" -> {
                    event.getDataObjectDeserializer()
                         .getObject()
                         .ifPresent(obj -> {
                             Session session = (Session) obj;
                             String userId = session.getMetadata().get("userId");
                             log.info("Checkout completed for userId={} subscriptionId={}",
                                     userId, session.getSubscription());
                             activateSubscription(userId, session.getSubscription());
                         });
                }
                case "customer.subscription.deleted" -> {
                    log.info("Subscription cancelled: {}", event.getId());
                }
                default -> log.debug("Unhandled Stripe event: {}", event.getType());
            }
            return ResponseEntity.<Void>ok().build();
        });
    }

    private void activateSubscription(String userId, String subscriptionId) {
        try {
            UUID id = UUID.fromString(userId);
            userRepository.findById(id).ifPresent(user -> {
                user.setPlan("pro");
                user.setStripeSubscriptionId(subscriptionId);
                userRepository.save(user);
                log.info("Activated PRO plan for userId={}", id);
            });
        } catch (Exception e) {
            log.error("Failed to activate subscription for userId={}: {}", userId, e.getMessage());
        }
    }
}
