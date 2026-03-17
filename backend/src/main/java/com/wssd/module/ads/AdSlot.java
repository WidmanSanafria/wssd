package com.wssd.module.ads;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ad_slots")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "slot_name", nullable = false, unique = true, length = 50)
    private String slotName;

    @Column(name = "ad_unit_id")
    private String adUnitId;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "show_from_download_n", nullable = false)
    @Builder.Default
    private int showFromDownloadN = 2;
}
