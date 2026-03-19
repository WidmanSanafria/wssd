package com.wssd.module.auth;

import com.wssd.module.auth.dto.TokenResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class OAuthService {

    private final UserRepository userRepository;
    private final AuthService    authService;
    private final WebClient      webClient = WebClient.create();

    @Value("${oauth2.google.client-id}")
    private String clientId;

    @Value("${oauth2.google.client-secret}")
    private String clientSecret;

    @Value("${oauth2.google.redirect-uri}")
    private String redirectUri;

    @SuppressWarnings("unchecked")
    public TokenResponse handleGoogleCallback(String code) {
        // 1. Exchange code for tokens
        Map<String, Object> tokenResp = webClient.post()
            .uri("https://oauth2.googleapis.com/token")
            .body(BodyInserters.fromFormData("code", code)
                .with("client_id", clientId)
                .with("client_secret", clientSecret)
                .with("redirect_uri", redirectUri)
                .with("grant_type", "authorization_code"))
            .retrieve()
            .bodyToMono(Map.class)
            .block();

        if (tokenResp == null || !tokenResp.containsKey("access_token")) {
            throw new RuntimeException("Failed to exchange code for token");
        }
        String googleAccessToken = (String) tokenResp.get("access_token");

        // 2. Get user info from Google
        Map<String, Object> userInfo = webClient.get()
            .uri("https://www.googleapis.com/oauth2/v2/userinfo")
            .header("Authorization", "Bearer " + googleAccessToken)
            .retrieve()
            .bodyToMono(Map.class)
            .block();

        if (userInfo == null || !userInfo.containsKey("id")) {
            throw new RuntimeException("Failed to get user info from Google");
        }

        String googleId    = (String) userInfo.get("id");
        String email       = (String) userInfo.get("email");
        String displayName = (String) userInfo.getOrDefault("name", email);

        // 3. Find or create user
        User user = userRepository.findByGoogleId(googleId).orElseGet(() ->
            userRepository.findByEmail(email).map(existing -> {
                existing.setGoogleId(googleId);
                return userRepository.save(existing);
            }).orElseGet(() -> {
                User newUser = User.builder()
                    .email(email)
                    .displayName(displayName)
                    .googleId(googleId)
                    .plan("free")
                    .build();
                return userRepository.save(newUser);
            })
        );

        // 4. Issue our JWT tokens
        return authService.issueTokens(user);
    }
}
