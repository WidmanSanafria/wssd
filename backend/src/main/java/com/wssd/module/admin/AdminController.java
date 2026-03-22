package com.wssd.module.admin;

import com.wssd.module.auth.User;
import com.wssd.module.auth.UserRepository;
import com.wssd.module.download.DownloadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final UserRepository     userRepository;
    private final DownloadRepository downloadRepository;

    /** GET /api/admin/stats */
    @GetMapping("/stats")
    public Mono<Map<String, Object>> getStats() {
        return Mono.fromCallable(() -> {
            long totalUsers      = userRepository.count();
            long proUsers        = userRepository.countByPlan("pro");
            long enterpriseUsers = userRepository.countByPlan("enterprise");
            long freeUsers       = userRepository.countByPlan("free");
            long totalDownloads  = downloadRepository.count();
            long fbDownloads     = downloadRepository.countByPlatform("facebook");
            long igDownloads     = downloadRepository.countByPlatform("instagram");
            long ttDownloads     = downloadRepository.countByPlatform("tiktok");

            Map<String, Object> stats = new LinkedHashMap<>();
            stats.put("totalUsers",      totalUsers);
            stats.put("proUsers",        proUsers);
            stats.put("enterpriseUsers", enterpriseUsers);
            stats.put("freeUsers",       freeUsers);
            stats.put("totalDownloads",  totalDownloads);
            stats.put("byPlatform", Map.of(
                "facebook",  fbDownloads,
                "instagram", igDownloads,
                "tiktok",    ttDownloads
            ));
            return stats;
        }).subscribeOn(Schedulers.boundedElastic());
    }

    /** GET /api/admin/users?page=0&size=50&search= */
    @GetMapping("/users")
    public Mono<Map<String, Object>> getUsers(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "")   String search) {
        return Mono.fromCallable(() -> {
            List<User> users = search.isBlank()
                ? userRepository.findAll(PageRequest.of(page, size)).getContent()
                : userRepository.findByEmailContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(
                    search, search, PageRequest.of(page, size)).getContent();

            long total = search.isBlank() ? userRepository.count()
                : userRepository.countByEmailContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(search, search);

            List<Map<String, Object>> result = users.stream().map(u -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",          u.getId());
                m.put("email",       u.getEmail());
                m.put("displayName", u.getDisplayName());
                m.put("plan",        u.getPlan());
                m.put("createdAt",   u.getCreatedAt());
                m.put("googleId",    u.getGoogleId() != null);
                m.put("downloads",   downloadRepository.countByUserId(u.getId()));
                return m;
            }).toList();

            return Map.of("users", result, "total", total, "page", page, "size", size);
        }).subscribeOn(Schedulers.boundedElastic());
    }

    /** PUT /api/admin/users/{id}/plan */
    @PutMapping("/users/{id}/plan")
    public Mono<Map<String, Object>> updatePlan(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        return Mono.fromCallable(() -> {
            String newPlan = body.get("plan");
            if (newPlan == null || !List.of("free", "pro", "enterprise", "admin").contains(newPlan)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid plan: " + newPlan);
            }
            User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
            user.setPlan(newPlan);
            userRepository.save(user);
            log.info("Admin changed plan for user {} -> {}", user.getEmail(), newPlan);
            Map<String, Object> result = new java.util.HashMap<>();
            result.put("id", id.toString());
            result.put("plan", newPlan);
            result.put("ok", true);
            return result;
        }).subscribeOn(Schedulers.boundedElastic());
    }

    /** GET /api/admin/downloads?page=0&size=100 */
    @GetMapping("/downloads")
    public Mono<List<Map<String, Object>>> getDownloads(
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "100") int size) {
        return Mono.fromCallable(() ->
            downloadRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
                .stream().map(d -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id",        d.getId());
                    m.put("platform",  d.getPlatform());
                    m.put("title",     d.getTitle());
                    m.put("sourceUrl", d.getSourceUrl());
                    m.put("createdAt", d.getCreatedAt());
                    m.put("userId",    d.getUserId());
                    m.put("hadAds",    d.isHadAds());
                    return m;
                }).toList()
        ).subscribeOn(Schedulers.boundedElastic());
    }
}
