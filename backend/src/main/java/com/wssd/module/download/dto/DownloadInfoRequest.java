package com.wssd.module.download.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public record DownloadInfoRequest(
    @JsonProperty("url") @NotBlank(message = "La URL es requerida") String url
) {}
