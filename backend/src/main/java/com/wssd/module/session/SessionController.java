package com.wssd.module.session;

import lombok.RequiredArgsConstructor;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/session")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;

    @GetMapping("/status")
    public Mono<Map<String, Object>> status(
            ServerHttpRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        String sessionId = getSessionId(request);

        return sessionService.getCountFromRedis(sessionId)
            .map(count -> {
                boolean loggedIn  = principal != null;
                boolean showAds   = sessionService.shouldShowAds(count);
                int remaining     = Math.max(0, sessionService.getFreeTotal() - count);
                String plan       = loggedIn ? "registered" : "anonymous";

                return Map.<String, Object>of(
                    "count",         count,
                    "showAds",       showAds,
                    "plan",          plan,
                    "loggedIn",      loggedIn,
                    "remainingFree", remaining
                );
            })
            .subscribeOn(Schedulers.boundedElastic());
    }

    private String getSessionId(ServerHttpRequest request) {
        return request.getCookies().getFirst("wssd_session") != null
            ? Objects.requireNonNull(request.getCookies().getFirst("wssd_session")).getValue()
            : "unknown";
    }
}
