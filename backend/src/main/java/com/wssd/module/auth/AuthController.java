package com.wssd.module.auth;

import com.wssd.module.auth.dto.LoginRequest;
import com.wssd.module.auth.dto.RegisterRequest;
import com.wssd.module.auth.dto.TokenResponse;
import jakarta.validation.Valid;
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
    public Mono<TokenResponse> register(@Valid @RequestBody RegisterRequest request) {
        return Mono.fromCallable(() -> authService.register(request))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/login")
    public Mono<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        return Mono.fromCallable(() -> authService.login(request))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/refresh")
    public Mono<TokenResponse> refresh(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        return Mono.fromCallable(() -> authService.refresh(refreshToken))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/logout")
    public Mono<Map<String, String>> logout() {
        // Stateless JWT: client just deletes the token
        return Mono.just(Map.of("message", "Sesión cerrada correctamente"));
    }
}
