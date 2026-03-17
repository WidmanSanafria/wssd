package com.wssd.module.ads.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdSlotDto {
    private String slotName;
    private String adUnitId;
}
