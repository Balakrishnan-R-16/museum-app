package com.museum.ticketbooking.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_cache")
public class AiCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long museumId;

    @Column(nullable = false)
    private String cacheKey; // e.g., "CROWD_FORECAST", "YIELD_OPTIMIZER", "SENTIMENT"

    @Column(columnDefinition = "TEXT")
    private String cacheValue; // The JSON string of the result

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public AiCache() {}

    public AiCache(Long museumId, String cacheKey, String cacheValue, LocalDateTime updatedAt) {
        this.museumId = museumId;
        this.cacheKey = cacheKey;
        this.cacheValue = cacheValue;
        this.updatedAt = updatedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getMuseumId() { return museumId; }
    public void setMuseumId(Long museumId) { this.museumId = museumId; }

    public String getCacheKey() { return cacheKey; }
    public void setCacheKey(String cacheKey) { this.cacheKey = cacheKey; }

    public String getCacheValue() { return cacheValue; }
    public void setCacheValue(String cacheValue) { this.cacheValue = cacheValue; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
