package com.wssd.module.user;

import com.wssd.module.auth.User;
import com.wssd.module.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public Mono<Map<String, Object>> me(@AuthenticationPrincipal User user) {
        return Mono.just(Map.of(
            "id",          user.getId().toString(),
            "email",       user.getEmail(),
            "displayName", user.getDisplayName() != null ? user.getDisplayName() : "",
            "plan",        user.getPlan(),
            "createdAt",   user.getCreatedAt().toString()
        ));
    }

    @DeleteMapping("/me")
    public Mono<Map<String, String>> deleteMe(@AuthenticationPrincipal User user) {
        return Mono.fromRunnable(() -> userRepository.deleteById(user.getId()))
            .subscribeOn(Schedulers.boundedElastic())
            .thenReturn(Map.of("message", "Cuenta eliminada correctamente"));
    }
}
