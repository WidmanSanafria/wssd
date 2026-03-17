package com.wssd.module.download;

import com.wssd.module.ads.AdsService;
import com.wssd.module.ads.dto.AdSlotDto;
import com.wssd.module.auth.User;
import com.wssd.module.download.dto.DownloadInfoRequest;
import com.wssd.module.session.AnonSession;
import com.wssd.module.session.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/api/download")
@RequiredArgsConstructor
@Slf4j
public class DownloadController {

    private final ExtractorClient  extractorClient;
    private final SessionService   sessionService;
    private final AdsService       adsService;
    private final DownloadRepository downloadRepository;

    // ── POST /api/download/info ────────────────────────────────────────────
    @PostMapping("/info")
    public Mono<Map<String, Object>> getInfo(
            @Valid @RequestBody DownloadInfoRequest request,
            ServerHttpRequest httpRequest,
            ServerHttpResponse httpResponse,
            @AuthenticationPrincipal User user) {

        String sessionId = resolveSessionId(httpRequest, httpResponse);
        String ip = resolveIp(httpRequest);

        return Mono.fromCallable(() -> {
                AnonSession session = sessionService.getOrCreate(sessionId, ip, null);
                int currentCount = session.getDownloadCount();

                // Enforce free limit for anonymous users
                if (user == null && sessionService.hasExceededFreeLimit(currentCount)) {
                    throw new ResponseStatusException(PAYMENT_REQUIRED,
                        "Límite de descargas gratuitas alcanzado. Regístrate para continuar.");
                }
                return currentCount;
            })
            .subscribeOn(Schedulers.boundedElastic())
            .flatMap(currentCount ->
                extractorClient.getInfo(request.getUrl())
                    .map(info -> {
                        // Determine download count AFTER this request
                        int nextCount = currentCount + 1;
                        List<AdSlotDto> slots = adsService.resolveSlots(nextCount);

                        // Build enriched response
                        Map<String, Object> response = new HashMap<>(info);
                        response.put("adsConfig",    slots);
                        response.put("sessionCount", nextCount);

                        // Record download asynchronously
                        recordDownload(user, sessionId, request.getUrl(), info, slots, ip);

                        // Increment session counter
                        sessionService.incrementDownload(sessionId);

                        return response;
                    })
            );
    }

    // ── GET /api/download/proxy ────────────────────────────────────────────
    @GetMapping("/proxy")
    public Mono<ResponseEntity<Flux<byte[]>>> proxy(
            @RequestParam String url,
            @RequestParam(defaultValue = "video.mp4") String filename) {

        String decodedUrl = URLDecoder.decode(url, StandardCharsets.UTF_8);
        Flux<byte[]> stream = extractorClient.proxy(decodedUrl, filename);

        return Mono.just(ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + sanitize(filename) + "\"")
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .body(stream));
    }

    // ── GET /api/download/merge ────────────────────────────────────────────
    @GetMapping("/merge")
    public Mono<ResponseEntity<Flux<byte[]>>> merge(
            @RequestParam String video_url,
            @RequestParam String audio_url,
            @RequestParam(defaultValue = "video_hd") String filename) {

        Flux<byte[]> stream = extractorClient.merge(
            URLDecoder.decode(video_url, StandardCharsets.UTF_8),
            URLDecoder.decode(audio_url, StandardCharsets.UTF_8),
            filename
        );

        return Mono.just(ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + sanitize(filename) + ".mp4\"")
            .contentType(MediaType.parseMediaType("video/mp4"))
            .body(stream));
    }

    // ── GET /api/download/ytdlp ────────────────────────────────────────────
    @GetMapping("/ytdlp")
    public Mono<ResponseEntity<Flux<byte[]>>> ytdlp(
            @RequestParam String page_url,
            @RequestParam(defaultValue = "best") String format_id,
            @RequestParam(defaultValue = "video") String filename) {

        Flux<byte[]> stream = extractorClient.ytdlpDownload(
            URLDecoder.decode(page_url, StandardCharsets.UTF_8),
            format_id,
            filename
        );

        return Mono.just(ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + sanitize(filename) + ".mp4\"")
            .contentType(MediaType.parseMediaType("video/mp4"))
            .body(stream));
    }

    // ── GET /api/download/history ──────────────────────────────────────────
    @GetMapping("/history")
    public Mono<List<Download>> history(@AuthenticationPrincipal User user) {
        return Mono.fromCallable(() ->
                downloadRepository.findByUserIdOrderByCreatedAtDesc(
                    user.getId(), PageRequest.of(0, 50)))
            .subscribeOn(Schedulers.boundedElastic());
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private String resolveSessionId(ServerHttpRequest req, ServerHttpResponse res) {
        var cookie = req.getCookies().getFirst("wssd_session");
        if (cookie != null && !cookie.getValue().isBlank()) {
            return cookie.getValue();
        }
        String newId = SessionService.newSessionId();
        res.addCookie(
            org.springframework.http.ResponseCookie.from("wssd_session", newId)
                .httpOnly(true)
                .path("/")
                .maxAge(java.time.Duration.ofDays(30))
                .sameSite("Lax")
                .build()
        );
        return newId;
    }

    private String resolveIp(ServerHttpRequest req) {
        String xff = req.getHeaders().getFirst("X-Forwarded-For");
        if (xff != null) return xff.split(",")[0].trim();
        var addr = req.getRemoteAddress();
        return addr != null ? addr.getAddress().getHostAddress() : "unknown";
    }

    @SuppressWarnings("unchecked")
    private void recordDownload(User user, String sessionId, String url,
                                 Map<String, Object> info, List<AdSlotDto> slots, String ip) {
        Mono.fromRunnable(() -> {
            Download dl = Download.builder()
                .userId(user != null ? user.getId() : null)
                .sessionId(sessionId)
                .platform((String) info.getOrDefault("platform", "unknown"))
                .sourceUrl(url)
                .title((String) info.get("title"))
                .hadAds(!slots.isEmpty())
                .ipAddress(ip)
                .build();
            downloadRepository.save(dl);
        })
        .subscribeOn(Schedulers.boundedElastic())
        .subscribe();
    }

    private String sanitize(String name) {
        return name.replaceAll("[^\\w\\-.]", "_").substring(0, Math.min(name.length(), 80));
    }
}
