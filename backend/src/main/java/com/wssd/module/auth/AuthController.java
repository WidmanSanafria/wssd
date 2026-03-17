package com.wssd.module.auth;

import com.wssd.module.auth.dto.LoginRequest;
import com.wssd.module.auth.dto.RegisterRequest;
import com.wssd.module.auth.dto.TokenResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<TokenResponse> register(@RequestBody Mono<Map<String, String>> bodyMono) {
        return bodyMono.flatMap(body -> {
            RegisterRequest request = new RegisterRequest(
                body.get("email"),
                body.get("password"),
                body.get("displayName")
            );
            return Mono.fromCallable(() -> authService.register(request))
                .subscribeOn(Schedulers.boundedElastic());
        });
    }

    @PostMapping("/login")
    public Mono<TokenResponse> login(@RequestBody Mono<Map<String, String>> bodyMono) {
        return bodyMono.flatMap(body -> {
            LoginRequest request = new LoginRequest(
                body.get("email"),
                body.get("password")
            );
            return Mono.fromCallable(() -> authService.login(request))
                .subscribeOn(Schedulers.boundedElastic());
        });
    }

    @PostMapping("/refresh")
    public Mono<TokenResponse> refresh(@RequestBody Mono<Map<String, String>> bodyMono) {
        return bodyMono
            .flatMap(body -> {
                String refreshToken = body.get("refreshToken");
                return Mono.fromCallable(() -> authService.refresh(refreshToken))
                    .subscribeOn(Schedulers.boundedElastic());
            });
    }

    @PostMapping("/logout")
    public Mono<Map<String, String>> logout() {
        return Mono.just(Map.of("message", "Sesión cerrada correctamente"));
    }
}
