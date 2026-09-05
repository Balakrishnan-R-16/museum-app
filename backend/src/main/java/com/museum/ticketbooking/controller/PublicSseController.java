package com.museum.ticketbooking.controller;

import com.museum.ticketbooking.service.SseService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/public/sse")
@CrossOrigin(origins = "http://localhost:5173")
public class PublicSseController {

    private final SseService sseService;

    public PublicSseController(SseService sseService) {
        this.sseService = sseService;
    }

    @GetMapping(value = "/museums", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamMuseums() {
        return sseService.subscribeGlobal();
    }
}
