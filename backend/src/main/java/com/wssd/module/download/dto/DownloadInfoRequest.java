package com.wssd.module.download.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DownloadInfoRequest {
    @NotBlank(message = "La URL es requerida")
    private String url;
}
