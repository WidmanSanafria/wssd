package com.wssd.module.session;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "anon_sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnonSession {

    @Id
    @Column(name = "session_id", length = 64)
    private String sessionId;

    private String fingerprint;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "download_count", nullable = false)
    @Builder.Default
    private int downloadCount = 0;

    @Column(name = "first_seen_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant firstSeenAt = Instant.now();

    @Column(name = "last_seen_at", nullable = false)
    @Builder.Default
    private Instant lastSeenAt = Instant.now();
}
