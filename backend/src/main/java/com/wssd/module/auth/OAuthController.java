package com.wssd.module.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/auth/oauth2")
@RequiredArgsConstructor
public class OAuthController {

    private final OAuthService oAuthService;

    @Value("${oauth2.google.client-id}")
    private String googleClientId;

    @Value("${oauth2.google.redirect-uri}")
    private String redirectUri;

    @Value("${app.url}")
    private String appUrl;

    /** Step 1: redirect user to Google consent screen */
    @GetMapping("/google/redirect")
    public Mono<Void> googleRedirect(ServerHttpResponse response) {
        String scope = URLEncoder.encode("openid email profile", StandardCharsets.UTF_8);
        String url = "https://accounts.google.com/o/oauth2/v2/auth" +
            "?client_id=" + googleClientId +
            "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8) +
            "&response_type=code" +
            "&scope=" + scope +
            "&access_type=offline" +
            "&prompt=select_account";
        response.setStatusCode(HttpStatus.FOUND);
        response.getHeaders().setLocation(URI.create(url));
        return response.setComplete();
    }

    /** Step 2: Google calls back with ?code=xxx */
    @GetMapping("/google/callback")
    public Mono<Void> googleCallback(
            @RequestParam String code,
            @RequestParam(required = false) String error,
            ServerHttpResponse response) {

        if (error != null) {
            response.setStatusCode(HttpStatus.FOUND);
            response.getHeaders().setLocation(URI.create(appUrl + "/login?error=oauth_cancelled"));
            return response.setComplete();
        }

        return Mono.fromCallable(() -> oAuthService.handleGoogleCallback(code))
            .subscribeOn(Schedulers.boundedElastic())
            .flatMap(tokens -> {
                String redirect = appUrl + "/login/oauth2/success" +
                    "?access=" + URLEncoder.encode(tokens.getAccessToken(), StandardCharsets.UTF_8) +
                    "&refresh=" + URLEncoder.encode(tokens.getRefreshToken(), StandardCharsets.UTF_8);
                response.setStatusCode(HttpStatus.FOUND);
                response.getHeaders().setLocation(URI.create(redirect));
                return response.setComplete();
            })
            .onErrorResume(ex -> {
                log.error("OAuth callback error", ex);
                response.setStatusCode(HttpStatus.FOUND);
                response.getHeaders().setLocation(URI.create(appUrl + "/login?error=oauth_failed"));
                return response.setComplete();
            });
    }

    private static final org.slf4j.Logger log =
        org.slf4j.LoggerFactory.getLogger(OAuthController.class);
}
