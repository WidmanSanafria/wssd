package com.wssd.module.billing;

import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.Price;
import com.stripe.model.PriceCollection;
import com.stripe.model.Product;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.PriceCreateParams;
import com.stripe.param.PriceListParams;
import com.stripe.param.ProductCreateParams;
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

    @Value("${app.url:https://45-55-251-17.sslip.io}")
    private String appUrl;

    private final UserRepository userRepository;

    @PostConstruct
    void init() {
        Stripe.apiKey = stripeSecretKey;
        // Auto-create Stripe products/prices if using placeholder IDs
        if (proPriceId.startsWith("price_pro") || proPriceId.isBlank()) {
            try {
                proPriceId = ensureStripePriceExists("WSSD Pro", "Pro plan — Descargas ilimitadas, HD, sin anuncios", 799L);
                enterprisePriceId = ensureStripePriceExists("WSSD Enterprise", "Enterprise plan — API + multi-usuario + SLA 99.9%", 1999L);
                log.info("Stripe prices initialized: pro={} enterprise={}", proPriceId, enterprisePriceId);
            } catch (Exception e) {
                log.warn("Could not auto-create Stripe prices: {}", e.getMessage());
            }
        }
    }

    private String ensureStripePriceExists(String productName, String description, long unitAmountCents) throws StripeException {
        // Search for existing active price with this product name in metadata
        PriceListParams listParams = PriceListParams.builder()
            .setActive(true)
            .setLimit(100L)
            .build();
        PriceCollection prices = Price.list(listParams);
        for (Price p : prices.getData()) {
            if (p.getMetadata() != null && productName.equals(p.getMetadata().get("wssd_product"))) {
                return p.getId();
            }
        }
        // Create product
        ProductCreateParams prodParams = ProductCreateParams.builder()
            .setName(productName)
            .setDescription(description)
            .build();
        Product product = Product.create(prodParams);
        // Create price
        PriceCreateParams priceParams = PriceCreateParams.builder()
            .setProduct(product.getId())
            .setUnitAmount(unitAmountCents)
            .setCurrency("usd")
            .setRecurring(PriceCreateParams.Recurring.builder()
                .setInterval(PriceCreateParams.Recurring.Interval.MONTH)
                .build())
            .putMetadata("wssd_product", productName)
            .build();
        return Price.create(priceParams).getId();
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
                    .setSuccessUrl(appUrl + "/dashboard?checkout=success")
                    .setCancelUrl(appUrl + "/pricing?checkout=cancelled")
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
                Mono.just(ResponseEntity.badRequest()
                    .<CheckoutResponse>body(new CheckoutResponse("ERROR: " + e.getMessage()))))
          .onErrorResume(StripeException.class, e -> {
              log.error("Stripe error: {}", e.getMessage());
              return Mono.just(ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                  .<CheckoutResponse>body(new CheckoutResponse("ERROR: " + e.getMessage())));
          })
          .onErrorResume(Exception.class, e -> {
              log.error("Checkout error: {}", e.getMessage());
              return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                  .<CheckoutResponse>body(new CheckoutResponse("ERROR: " + e.getMessage())));
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
