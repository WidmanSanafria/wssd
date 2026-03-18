package com.wssd.config;

import com.wssd.module.auth.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.ReactiveAuthenticationManager;
import org.springframework.security.authentication.UserDetailsRepositoryReactiveAuthenticationManager;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.SecurityWebFiltersOrder;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.userdetails.ReactiveUserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.context.NoOpServerSecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebFluxSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .securityContextRepository(NoOpServerSecurityContextRepository.getInstance())
            .authorizeExchange(auth -> auth
                // Public endpoints
                .pathMatchers(HttpMethod.GET,  "/api/auth/oauth2/**").permitAll()
                .pathMatchers(HttpMethod.POST, "/api/auth/**").permitAll()
                .pathMatchers(HttpMethod.POST, "/api/download/info").permitAll()
                .pathMatchers(HttpMethod.GET,  "/api/download/proxy").permitAll()
                .pathMatchers(HttpMethod.GET,  "/api/download/merge").permitAll()
                .pathMatchers(HttpMethod.GET,  "/api/download/ytdlp").permitAll()
                .pathMatchers(HttpMethod.GET,  "/api/session/status").permitAll()
                .pathMatchers(HttpMethod.POST, "/api/billing/webhook").permitAll()
                .pathMatchers(HttpMethod.GET,  "/actuator/health").permitAll()
                .pathMatchers(HttpMethod.GET,  "/v3/api-docs/**").permitAll()
                .pathMatchers(HttpMethod.GET,  "/swagger-ui/**").permitAll()
                // Protected endpoints
                .pathMatchers("/api/user/**").authenticated()
                .pathMatchers("/api/billing/**").authenticated()
                .pathMatchers("/api/keys/**").authenticated()
                .pathMatchers("/api/download/history").authenticated()
                .pathMatchers("/api/admin/**").hasRole("ADMIN")
                .anyExchange().permitAll()
            )
            .addFilterAt(jwtAuthFilter, SecurityWebFiltersOrder.AUTHENTICATION)
            .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
            .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("http://localhost:4000", "http://localhost:4200", "https://*.wssd.app"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    public ReactiveAuthenticationManager reactiveAuthenticationManager(
            ReactiveUserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {
        var manager = new UserDetailsRepositoryReactiveAuthenticationManager(userDetailsService);
        manager.setPasswordEncoder(passwordEncoder);
        return manager;
    }
}
