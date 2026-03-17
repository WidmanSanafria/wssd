package com.wssd.module.session;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SessionService {

    private static final String KEY_PREFIX = "wssd:session:";
    private static final Duration TTL_24H  = Duration.ofHours(24);

    private final AnonSessionRepository sessionRepository;
    private final ReactiveStringRedisTemplate redis;

    @Value("${wssd.free-downloads-before-ads:1}")
    private int freeBeforeAds;

    @Value("${wssd.free-downloads-total:5}")
    private int freeTotal;

    @Transactional
    public AnonSession getOrCreate(String sessionId, String ip, String fingerprint) {
        return sessionRepository.findById(sessionId).orElseGet(() -> {
            AnonSession session = AnonSession.builder()
                .sessionId(sessionId)
                .ipAddress(ip)
                .fingerprint(fingerprint)
                .build();
            return sessionRepository.save(session);
        });
    }

    /** Increments download count in Redis (fast) and DB (durable). Returns new count. */
    @Transactional
    public int incrementDownload(String sessionId) {
        // Increment in Redis
        String redisKey = KEY_PREFIX + sessionId + ":count";
        redis.opsForValue().increment(redisKey)
            .flatMap(c -> redis.expire(redisKey, TTL_24H))
            .subscribeOn(Schedulers.boundedElastic())
            .subscribe();

        // Increment in DB
        return sessionRepository.findById(sessionId)
            .map(session -> {
                session.setDownloadCount(session.getDownloadCount() + 1);
                session.setLastSeenAt(Instant.now());
                return sessionRepository.save(session).getDownloadCount();
            })
            .orElse(1);
    }

    public Mono<Integer> getCountFromRedis(String sessionId) {
        String key = KEY_PREFIX + sessionId + ":count";
        return redis.opsForValue().get(key)
            .map(Integer::parseInt)
            .defaultIfEmpty(0);
    }

    public boolean shouldShowAds(int downloadCount) {
        return downloadCount > freeBeforeAds;
    }

    public boolean hasExceededFreeLimit(int downloadCount) {
        return downloadCount > freeTotal;
    }

    public int getFreeTotal() { return freeTotal; }

    public static String newSessionId() {
        return UUID.randomUUID().toString().replace("-", "");
    }
}
