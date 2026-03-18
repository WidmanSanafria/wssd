package com.wssd.module.auth;

import com.wssd.module.auth.dto.TokenResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SocialAuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final WebClient.Builder webClientBuilder;

    @Value("${oauth.google.client-id:}") String googleClientId;
    @Value("${oauth.google.client-secret:}") String googleClientSecret;
    @Value("${oauth.google.redirect-uri:}") String googleRedirectUri;

    @Value("${oauth.facebook.client-id:}") String facebookClientId;
    @Value("${oauth.facebook.client-secret:}") String facebookClientSecret;
    @Value("${oauth.facebook.redirect-uri:}") String facebookRedirectUri;

    public String buildGoogleAuthUrl() {
        return "https://accounts.google.com/o/oauth2/v2/auth?" +
            "client_id=" + googleClientId +
            "&redirect_uri=" + encodeUri(googleRedirectUri) +
            "&response_type=code" +
            "&scope=openid%20email%20profile" +
            "&access_type=offline";
    }

    public String buildFacebookAuthUrl() {
        return "https://www.facebook.com/v19.0/dialog/oauth?" +
            "client_id=" + facebookClientId +
            "&redirect_uri=" + encodeUri(facebookRedirectUri) +
            "&scope=email%2Cpublic_profile";
    }

    public Mono<TokenResponse> handleGoogleCallback(String code) {
        WebClient client = webClientBuilder.build();

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("client_id", googleClientId);
        formData.add("client_secret", googleClientSecret);
        formData.add("code", code);
        formData.add("redirect_uri", googleRedirectUri);
        formData.add("grant_type", "authorization_code");

        return client.post()
            .uri("https://oauth2.googleapis.com/token")
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(BodyInserters.fromFormData(formData))
            .retrieve()
            .bodyToMono(Map.class)
            .flatMap(tokenMap -> {
                String accessToken = (String) tokenMap.get("access_token");
                return client.get()
                    .uri("https://www.googleapis.com/oauth2/v3/userinfo")
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .bodyToMono(Map.class);
            })
            .flatMap(userInfo -> {
                String sub = (String) userInfo.get("sub");
                String email = (String) userInfo.get("email");
                String name = (String) userInfo.get("name");
                return Mono.fromCallable(() -> findOrCreateSocialUser("google", sub, email, name))
                    .subscribeOn(Schedulers.boundedElastic());
            })
            .map(this::buildTokenResponse);
    }

    public Mono<TokenResponse> handleFacebookCallback(String code) {
        WebClient client = webClientBuilder.build();

        return client.get()
            .uri(uriBuilder -> uriBuilder
                .scheme("https")
                .host("graph.facebook.com")
                .path("/v19.0/oauth/access_token")
                .queryParam("client_id", facebookClientId)
                .queryParam("client_secret", facebookClientSecret)
                .queryParam("code", code)
                .queryParam("redirect_uri", facebookRedirectUri)
                .build())
            .retrieve()
            .bodyToMono(Map.class)
            .flatMap(tokenMap -> {
                String accessToken = (String) tokenMap.get("access_token");
                return client.get()
                    .uri(uriBuilder -> uriBuilder
                        .scheme("https")
                        .host("graph.facebook.com")
                        .path("/me")
                        .queryParam("fields", "id,name,email")
                        .queryParam("access_token", accessToken)
                        .build())
                    .retrieve()
                    .bodyToMono(Map.class);
            })
            .flatMap(userInfo -> {
                String fbId = (String) userInfo.get("id");
                String name = (String) userInfo.get("name");
                String email = userInfo.get("email") != null
                    ? (String) userInfo.get("email")
                    : "fb_" + fbId + "@social.wssd";
                return Mono.fromCallable(() -> findOrCreateSocialUser("facebook", fbId, email, name))
                    .subscribeOn(Schedulers.boundedElastic());
            })
            .map(this::buildTokenResponse);
    }

    @Transactional
    protected User findOrCreateSocialUser(String provider, String providerId, String email, String displayName) {
        return userRepository.findByOauthProviderAndOauthProviderId(provider, providerId)
            .orElseGet(() -> {
                User user = userRepository.findByEmail(email).orElse(null);
                if (user != null) {
                    user.setOauthProvider(provider);
                    user.setOauthProviderId(providerId);
                    return userRepository.save(user);
                }
                return userRepository.save(User.builder()
                    .email(email)
                    .displayName(displayName)
                    .oauthProvider(provider)
                    .oauthProviderId(providerId)
                    .build());
            });
    }

    private TokenResponse buildTokenResponse(User user) {
        return TokenResponse.builder()
            .accessToken(jwtService.generateToken(user))
            .refreshToken(jwtService.generateRefreshToken(user))
            .expiresIn(jwtService.getExpirationMs() / 1000)
            .user(TokenResponse.UserDto.builder()
                .id(user.getId().toString())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .plan(user.getPlan())
                .build())
            .build();
    }

    private String encodeUri(String uri) {
        return URLEncoder.encode(uri, StandardCharsets.UTF_8);
    }
}
