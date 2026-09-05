package com.museum.ticketbooking.controller;

import com.museum.ticketbooking.dto.*;
import com.museum.ticketbooking.service.AiService;
import com.museum.ticketbooking.service.GeminiService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class AiController {

    private static final Logger logger = LoggerFactory.getLogger(AiController.class);

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    // ── Helper: extract museumId from JWT (same pattern as OwnerController) ──
    private Long getMuseumId(HttpServletRequest request) {
        String idStr = (String) request.getAttribute("museumId");
        if (idStr == null) throw new RuntimeException("Unauthorized");
        return Long.parseLong(idStr);
    }

    // ════════════════════════════════════════════════════════════════════════
    // ADMIN ENDPOINTS (require MUSEUM role via SecurityConfig)
    // ════════════════════════════════════════════════════════════════════════

    @PostMapping("/api/owner/ai/crowd-forecast")
    public ResponseEntity<AiResponse<Map<String, Object>>> crowdForecast(HttpServletRequest request) {
        try {
            Long museumId = getMuseumId(request);
            Map<String, Object> data = aiService.getCrowdForecast(museumId);
            String source = data.containsKey("aiError") ? "calculated_analytics" : "gemini+analytics";
            return ResponseEntity.ok(AiResponse.ok(data, source));
        } catch (GeminiService.GeminiException e) {
            return ResponseEntity.ok(AiResponse.error(e.getErrorCode(), e.getMessage()));
        } catch (Exception e) {
            logger.error("Crowd forecast failed", e);
            return ResponseEntity.ok(AiResponse.error("AI_SERVICE_UNAVAILABLE",
                    "Failed to generate crowd forecast. Please try again."));
        }
    }

    @PostMapping("/api/owner/ai/yield-recommendation")
    public ResponseEntity<AiResponse<Map<String, Object>>> yieldRecommendation(HttpServletRequest request) {
        try {
            Long museumId = getMuseumId(request);
            Map<String, Object> data = aiService.getYieldRecommendation(museumId);
            String source = data.containsKey("aiError") ? "rule_based_recommendation" : "gemini+rules";
            return ResponseEntity.ok(AiResponse.ok(data, source));
        } catch (GeminiService.GeminiException e) {
            return ResponseEntity.ok(AiResponse.error(e.getErrorCode(), e.getMessage()));
        } catch (Exception e) {
            logger.error("Yield recommendation failed", e);
            return ResponseEntity.ok(AiResponse.error("AI_SERVICE_UNAVAILABLE",
                    "Failed to generate yield recommendation. Please try again."));
        }
    }

    @PostMapping("/api/owner/ai/sentiment-analysis")
    public ResponseEntity<AiResponse<Map<String, Object>>> sentimentAnalysis(HttpServletRequest request) {
        try {
            Long museumId = getMuseumId(request);
            Map<String, Object> data = aiService.getSentimentAnalysis(museumId);
            String source = (String) data.getOrDefault("dataSource", "gemini");
            return ResponseEntity.ok(AiResponse.ok(data, source));
        } catch (GeminiService.GeminiException e) {
            return ResponseEntity.ok(AiResponse.error(e.getErrorCode(), e.getMessage()));
        } catch (Exception e) {
            logger.error("Sentiment analysis failed", e);
            return ResponseEntity.ok(AiResponse.error("AI_SERVICE_UNAVAILABLE",
                    "Failed to analyze reviews. Please try again."));
        }
    }

    @PostMapping("/api/owner/ai/ask")
    public ResponseEntity<AiResponse<Map<String, Object>>> askBusinessQuestion(
            HttpServletRequest request,
            @Valid @RequestBody AiBusinessQueryRequest body) {
        try {
            Long museumId = getMuseumId(request);
            Map<String, Object> data = aiService.askBusinessQuestion(museumId, body.getQuestion());
            String source = data.containsKey("aiError") ? "metrics_only" : "gemini+metrics";
            return ResponseEntity.ok(AiResponse.ok(data, source));
        } catch (GeminiService.GeminiException e) {
            return ResponseEntity.ok(AiResponse.error(e.getErrorCode(), e.getMessage()));
        } catch (Exception e) {
            logger.error("Business query failed", e);
            return ResponseEntity.ok(AiResponse.error("AI_SERVICE_UNAVAILABLE",
                    "Failed to process your question. Please try again."));
        }
    }

    @PostMapping("/api/owner/ai/review-response")
    public ResponseEntity<AiResponse<Map<String, Object>>> draftReviewResponse(
            HttpServletRequest request,
            @Valid @RequestBody AiReviewResponseRequest body) {
        try {
            Long museumId = getMuseumId(request);
            Map<String, Object> data = aiService.draftReviewResponse(
                    museumId, body.getReviewId(), body.getTone());
            return ResponseEntity.ok(AiResponse.ok(data, "gemini"));
        } catch (GeminiService.GeminiException e) {
            return ResponseEntity.ok(AiResponse.error(e.getErrorCode(), e.getMessage()));
        } catch (RuntimeException e) {
            if (e.getMessage() != null && (e.getMessage().contains("not found") || e.getMessage().contains("does not belong"))) {
                return ResponseEntity.ok(AiResponse.error("INVALID_REQUEST", e.getMessage()));
            }
            logger.error("Review response draft failed", e);
            return ResponseEntity.ok(AiResponse.error("AI_SERVICE_UNAVAILABLE",
                    "Failed to draft review response. Please try again."));
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // PUBLIC ENDPOINT (visitor-facing, no auth required)
    // ════════════════════════════════════════════════════════════════════════

    @PostMapping("/api/public/ai/visitor-guide")
    public ResponseEntity<AiResponse<Map<String, Object>>> visitorGuide(
            @Valid @RequestBody AiVisitorGuideRequest body) {
        try {
            Map<String, Object> data = aiService.askVisitorGuide(
                    body.getMuseumId(), body.getQuestion(), body.getLang());
            String source = (String) data.getOrDefault("source", "gemini");
            return ResponseEntity.ok(AiResponse.ok(data, source));
        } catch (GeminiService.GeminiException e) {
            return ResponseEntity.ok(AiResponse.error(e.getErrorCode(), e.getMessage()));
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("Museum not found")) {
                return ResponseEntity.ok(AiResponse.error("INVALID_REQUEST", "Museum not found."));
            }
            logger.error("Visitor guide failed", e);
            return ResponseEntity.ok(AiResponse.error("AI_SERVICE_UNAVAILABLE",
                    "AI assistant is temporarily unavailable. Please try again."));
        }
    }
}
