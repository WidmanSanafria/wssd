package com.wssd.module.ads;

import com.wssd.module.ads.dto.AdSlotDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdsService {

    private final AdSlotRepository adSlotRepository;

    /**
     * Returns the ad slots to display for a given download count.
     * Download #1  → no ads (empty list)
     * Downloads #2–5 → active slots with show_from_download_n <= downloadCount
     * Download #6+ → user should have been redirected to /upgrade before reaching here
     */
    public List<AdSlotDto> resolveSlots(int downloadCount) {
        if (downloadCount <= 1) return List.of();

        return adSlotRepository
            .findByActiveTrueAndShowFromDownloadNLessThanEqual(downloadCount)
            .stream()
            .map(slot -> AdSlotDto.builder()
                .slotName(slot.getSlotName())
                .adUnitId(slot.getAdUnitId())
                .build())
            .toList();
    }
}
