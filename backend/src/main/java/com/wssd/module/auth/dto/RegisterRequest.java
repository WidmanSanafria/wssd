package com.wssd.module.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @JsonProperty("email")       @NotBlank @Email                    String email,
    @JsonProperty("password")    @NotBlank @Size(min = 8, max = 100) String password,
    @JsonProperty("displayName") @NotBlank @Size(min = 2, max = 100) String displayName
) {}
