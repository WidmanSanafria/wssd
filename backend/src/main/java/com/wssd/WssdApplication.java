package com.wssd;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class WssdApplication {
    public static void main(String[] args) {
        SpringApplication.run(WssdApplication.class, args);
    }
}
