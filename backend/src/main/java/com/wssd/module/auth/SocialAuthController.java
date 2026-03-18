package com.wssd.module.auth;

import com.wssd.module.auth.dto.TokenResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.net.URI;

@RestController
@RequestMapping("/api/auth/oauth2")
@RequiredArgsConstructor
@Slf4j
public class SocialAuthController {

    private final SocialAuthService socialAuthService;

    @GetMapping("/{provider}/redirect")
    public Mono<Void> redirect(@PathVariable String provider, ServerHttpResponse response) {
        String url = switch (provider) {
            case "google"   -> socialAuthService.buildGoogleAuthUrl();
            case "facebook" -> socialAuthService.buildFacebookAuthUrl();
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provider no soportado");
        };
        response.setStatusCode(HttpStatus.FOUND);
        response.getHeaders().setLocation(URI.create(url));
        return response.setComplete();
    }

    @GetMapping("/{provider}/callback")
    public Mono<Void> callback(
            @PathVariable String provider,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String error,
            ServerHttpResponse response) {

        if (error != null || code == null) {
            response.setStatusCode(HttpStatus.FOUND);
            response.getHeaders().setLocation(URI.create("/login?error=oauth_cancelled"));
            return response.setComplete();
        }

        Mono<TokenResponse> tokenMono = switch (provider) {
            case "google"   -> socialAuthService.handleGoogleCallback(code);
            case "facebook" -> socialAuthService.handleFacebookCallback(code);
            default -> Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST));
        };

        return tokenMono
            .flatMap(tokens -> {
                String redirectUrl = "/?socialToken=" + tokens.getAccessToken() +
                    "&refreshToken=" + tokens.getRefreshToken();
                response.setStatusCode(HttpStatus.FOUND);
                response.getHeaders().setLocation(URI.create(redirectUrl));
                return response.setComplete();
            })
            .onErrorResume(ex -> {
                log.error("OAuth2 callback error for {}: {}", provider, ex.getMessage());
                response.setStatusCode(HttpStatus.FOUND);
                response.getHeaders().setLocation(URI.create("/login?error=oauth_failed"));
                return response.setComplete();
            });
    }
}
