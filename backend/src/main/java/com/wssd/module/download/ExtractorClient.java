package com.wssd.module.download;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
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
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
            .doOnError(e -> log.error("Extractor /info error for {}: {}", url, e.getMessage()));
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
}
