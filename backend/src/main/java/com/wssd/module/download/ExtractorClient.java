package com.wssd.module.download;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class ExtractorClient {

    private final WebClient extractorWebClient;

    /** POST /info → returns the full JSON info map from the Python MS */
    public Mono<Map<String, Object>> getInfo(String url) {
        return extractorWebClient.post()
            .uri("/info")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(Map.of("url", url))
            .retrieve()
            .onStatus(status -> status.is4xxClientError(),
                resp -> resp.bodyToMono(String.class)
                    .map(body -> {
                        log.warn("Extractor /info 4xx for {}: {}", url, body);
                        String msg = extractDetail(body);
                        return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, msg);
                    }))
            .onStatus(status -> status.is5xxServerError(),
                resp -> resp.bodyToMono(String.class)
                    .map(body -> {
                        log.error("Extractor /info 5xx for {}: {}", url, body);
                        return new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                            "El extractor no pudo procesar la URL");
                    }))
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    /** GET /proxy → streams the CDN response */
    public Flux<byte[]> proxy(String url, String filename) {
        return extractorWebClient.get()
            .uri(uriBuilder -> uriBuilder
                .path("/proxy")
                .queryParam("url", url)
                .queryParam("filename", filename)
                .build())
            .retrieve()
            .bodyToFlux(byte[].class);
    }

    /** GET /merge → streams the ffmpeg-merged MP4 */
    public Flux<byte[]> merge(String videoUrl, String audioUrl, String filename) {
        return extractorWebClient.get()
            .uri(uriBuilder -> uriBuilder
                .path("/merge")
                .queryParam("video_url", videoUrl)
                .queryParam("audio_url", audioUrl)
                .queryParam("filename",  filename)
                .build())
            .retrieve()
            .bodyToFlux(byte[].class);
    }

    /** GET /ytdlp-download → streams the yt-dlp downloaded MP4 */
    public Flux<byte[]> ytdlpDownload(String pageUrl, String formatId, String filename) {
        return extractorWebClient.get()
            .uri(uriBuilder -> uriBuilder
                .path("/ytdlp-download")
                .queryParam("page_url",  pageUrl)
                .queryParam("format_id", formatId)
                .queryParam("filename",  filename)
                .build())
            .retrieve()
            .bodyToFlux(byte[].class);
    }

    /** Try to pull a human-readable message from the extractor JSON body, else return as-is. */
    private String extractDetail(String body) {
        if (body == null || body.isBlank()) return "URL no compatible o error al extraer";
        // extractor returns {"detail": "..."} on errors
        if (body.contains("\"detail\"")) {
            int start = body.indexOf("\"detail\"");
            int colon = body.indexOf(':', start);
            int quote1 = body.indexOf('"', colon + 1);
            int quote2 = body.indexOf('"', quote1 + 1);
            if (quote1 >= 0 && quote2 > quote1) return body.substring(quote1 + 1, quote2);
        }
        return body.length() > 200 ? "URL no compatible o error al extraer" : body;
    }
}
