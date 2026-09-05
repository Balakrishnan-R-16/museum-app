package com.museum.ticketbooking.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class SseService {

    // Map of MuseumID -> List of connected SSE Emitters
    private final Map<Long, List<SseEmitter>> emittersMap = new ConcurrentHashMap<>();
    
    // Global public connections
    private final List<SseEmitter> globalEmitters = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe(Long museumId) {
        SseEmitter emitter = new SseEmitter(60 * 60 * 1000L); // 1 hour timeout
        
        emittersMap.computeIfAbsent(museumId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(museumId, emitter));
        emitter.onTimeout(() -> removeEmitter(museumId, emitter));
        emitter.onError((e) -> removeEmitter(museumId, emitter));

        // Send initial connection event
        try {
            emitter.send(SseEmitter.event().name("connected").data("SSE Connection Established"));
        } catch (IOException e) {
            removeEmitter(museumId, emitter);
        }

        return emitter;
    }

    private void removeEmitter(Long museumId, SseEmitter emitter) {
        List<SseEmitter> list = emittersMap.get(museumId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                emittersMap.remove(museumId);
            }
        }
    }

    public void emitEvent(Long museumId, String eventName, Object data) {
        List<SseEmitter> list = emittersMap.get(museumId);
        if (list != null) {
            List<SseEmitter> deadEmitters = new ArrayList<>();
            list.forEach(emitter -> {
                try {
                    emitter.send(SseEmitter.event()
                            .name(eventName)
                            .data(data));
                } catch (IOException e) {
                    deadEmitters.add(emitter);
                }
            });
            list.removeAll(deadEmitters);
        }
    }

    public SseEmitter subscribeGlobal() {
        SseEmitter emitter = new SseEmitter(60 * 60 * 1000L); // 1 hour timeout
        
        globalEmitters.add(emitter);

        emitter.onCompletion(() -> globalEmitters.remove(emitter));
        emitter.onTimeout(() -> globalEmitters.remove(emitter));
        emitter.onError((e) -> globalEmitters.remove(emitter));

        try {
            emitter.send(SseEmitter.event().name("connected").data("Global SSE Connection Established"));
        } catch (IOException e) {
            globalEmitters.remove(emitter);
        }

        return emitter;
    }

    public void emitGlobalEvent(String eventName, Object data) {
        List<SseEmitter> deadEmitters = new ArrayList<>();
        globalEmitters.forEach(emitter -> {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(data));
            } catch (IOException e) {
                deadEmitters.add(emitter);
            }
        });
        globalEmitters.removeAll(deadEmitters);
    }

    // Keep connections alive
    @Scheduled(fixedRate = 25000)
    public void sendHeartbeat() {
        emittersMap.forEach((museumId, list) -> {
            List<SseEmitter> deadEmitters = new ArrayList<>();
            list.forEach(emitter -> {
                try {
                    emitter.send(SseEmitter.event().name("heartbeat").data("ping"));
                } catch (IOException e) {
                    deadEmitters.add(emitter);
                }
            });
            list.removeAll(deadEmitters);
        });

        // Heartbeat for global
        List<SseEmitter> deadGlobalEmitters = new ArrayList<>();
        globalEmitters.forEach(emitter -> {
            try {
                emitter.send(SseEmitter.event().name("heartbeat").data("ping"));
            } catch (IOException e) {
                deadGlobalEmitters.add(emitter);
            }
        });
        globalEmitters.removeAll(deadGlobalEmitters);
    }
}
