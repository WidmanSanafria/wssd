package com.wssd.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Configuration
public class WebClientConfig {

    @Value("${extractor.ms-url}")
    private String extractorMsUrl;

    @Bean
    public WebClient extractorWebClient() {
        HttpClient httpClient = HttpClient.create()
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 10_000)
            .responseTimeout(Duration.ofSeconds(300))
            .doOnConnected(conn -> conn
                .addHandlerLast(new ReadTimeoutHandler(300, TimeUnit.SECONDS))
                .addHandlerLast(new WriteTimeoutHandler(30,  TimeUnit.SECONDS)));

        return WebClient.builder()
            .baseUrl(extractorMsUrl)
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .codecs(c -> c.defaultCodecs().maxInMemorySize(50 * 1024 * 1024)) // 50MB
            .build();
    }
}
