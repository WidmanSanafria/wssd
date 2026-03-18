package com.wssd.module.auth;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "oauth_provider", length = 20)
    private String oauthProvider;

    @Column(name = "oauth_provider_id", length = 255)
    private String oauthProviderId;

    @Column(name = "display_name")
    private String displayName;

    @Column(nullable = false)
    @Builder.Default
    private String plan = "free";

    @Column(name = "plan_expires_at")
    private Instant planExpiresAt;

    @Column(name = "stripe_subscription_id")
    private String stripeSubscriptionId;

    @Column(name = "downloads_today", nullable = false)
    @Builder.Default
    private int downloadsToday = 0;

    @Column(name = "downloads_reset_at")
    private Instant downloadsResetAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() { this.updatedAt = Instant.now(); }

    // ── UserDetails ──────────────────────────────────────
    @Override public String getUsername() { return email; }
    @Override public String getPassword() { return passwordHash != null ? passwordHash : ""; }
    @Override public boolean isAccountNonExpired()     { return true; }
    @Override public boolean isAccountNonLocked()      { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled()               { return true; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + plan.toUpperCase()));
    }
}
