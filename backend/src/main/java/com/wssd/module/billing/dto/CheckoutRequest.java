package com.wssd.module.billing.dto;

import jakarta.validation.constraints.NotBlank;

public record CheckoutRequest(
    @NotBlank String plan   // "pro" | "enterprise"
) {}
