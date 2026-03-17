package com.wssd.module.download;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DownloadRepository extends JpaRepository<Download, UUID> {
    List<Download> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    List<Download> findBySessionIdOrderByCreatedAtDesc(String sessionId, Pageable pageable);
    long countByUserId(UUID userId);
}
