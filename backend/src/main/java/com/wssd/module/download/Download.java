package com.wssd.module.download;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "downloads")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Download {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "session_id", length = 64)
    private String sessionId;

    @Column(nullable = false, length = 20)
    private String platform;

    @Column(name = "source_url", nullable = false, columnDefinition = "TEXT")
    private String sourceUrl;

    @Column(length = 500)
    private String title;

    @Column(length = 50)
    private String format;

    @Column(name = "filesize_bytes")
    private Long filesizeBytes;

    @Column(name = "had_ads", nullable = false)
    @Builder.Default
    private boolean hadAds = false;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
