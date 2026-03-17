package com.wssd.module.auth.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TokenResponse {
    private String accessToken;
    private String refreshToken;
    private long   expiresIn;
    private UserDto user;

    @Data
    @Builder
    public static class UserDto {
        private String id;
        private String email;
        private String displayName;
        private String plan;
    }
}
