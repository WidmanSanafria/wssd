package com.wssd.module.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.userdetails.ReactiveUserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter implements WebFilter {

    private final JwtService jwtService;
    private final ReactiveUserDetailsService userDetailsService;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return chain.filter(exchange);
        }

        String token = authHeader.substring(7);

        try {
            String username = jwtService.extractUsername(token);
            return userDetailsService.findByUsername(username)
                .filter(ud -> jwtService.validateToken(token, ud))
                .map(ud -> new UsernamePasswordAuthenticationToken(ud, null, ud.getAuthorities()))
                .flatMap(auth -> chain.filter(exchange)
                    .contextWrite(ReactiveSecurityContextHolder.withAuthentication(auth)))
                .switchIfEmpty(chain.filter(exchange));
        } catch (Exception e) {
            log.debug("JWT filter error: {}", e.getMessage());
            return chain.filter(exchange);
        }
    }
}
