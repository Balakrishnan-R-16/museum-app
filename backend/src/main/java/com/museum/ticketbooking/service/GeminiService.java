package com.museum.ticketbooking.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Server-only Gemini REST client.
 * API key is read from environment and never exposed to frontend.
 */
@Service
public class GeminiService {

    private static final Logger logger = LoggerFactory.getLogger(GeminiService.class);
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-3.5-flash}")
    private String model;

    @Value("${gemini.sentiment-model:gemini-3.5-flash-lite}")
    private String sentimentModel;

    @Value("${gemini.timeout-seconds:30}")
    private int timeoutSeconds;

    @Value("${gemini.max-retries:2}")
    private int maxRetries;

    /**
     * Check if the Gemini service is configured (has an API key).
     */
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Core Gemini call. Sends a system instruction + user prompt and returns the text response.
     *
     * @param systemInstruction The system-level instruction (grounding, constraints)
     * @param userPrompt        The user-facing prompt/question
     * @return The text content from Gemini's response
     * @throws GeminiException if the call fails after retries
     */
    public String generateContent(String systemInstruction, String userPrompt) {
        return generateContent(systemInstruction, userPrompt, false);
    }

    public String generateContent(String systemInstruction, String userPrompt, boolean useSentimentModel) {
        if (!isConfigured()) {
            throw new GeminiException("AI_SERVICE_UNAVAILABLE", "Gemini API key is not configured.");
        }

        String targetModel = useSentimentModel ? sentimentModel : model;
        String url = String.format(GEMINI_API_URL, targetModel, apiKey);

        // Build request body
        Map<String, Object> requestBody = buildRequestBody(systemInstruction, userPrompt);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String jsonBody;
        try {
            jsonBody = objectMapper.writeValueAsString(requestBody);
        } catch (JsonProcessingException e) {
            throw new GeminiException("INVALID_REQUEST", "Failed to serialize request.");
        }

        HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

        // Retry loop
        Exception lastException = null;
        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                RestTemplate restTemplate = new RestTemplate();
                // Set timeout via SimpleClientHttpRequestFactory
                org.springframework.http.client.SimpleClientHttpRequestFactory factory =
                        new org.springframework.http.client.SimpleClientHttpRequestFactory();
                factory.setConnectTimeout(timeoutSeconds * 1000);
                factory.setReadTimeout(timeoutSeconds * 1000);
                restTemplate.setRequestFactory(factory);

                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    return extractTextFromResponse(response.getBody());
                } else {
                    throw new GeminiException("AI_INVALID_RESPONSE", "Gemini returned status " + response.getStatusCode());
                }
            } catch (ResourceAccessException e) {
                lastException = e;
                logger.warn("Gemini call attempt {} failed (timeout/connection): {}", attempt + 1, e.getMessage());
                if (attempt < maxRetries) {
                    try { Thread.sleep(1000L * (attempt + 1)); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                }
            } catch (GeminiException e) {
                throw e; // Don't retry on known errors
            } catch (Exception e) {
                lastException = e;
                logger.warn("Gemini call attempt {} failed: {}", attempt + 1, e.getMessage());
                if (attempt < maxRetries) {
                    try { Thread.sleep(1000L * (attempt + 1)); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                }
            }
        }

        logger.error("Gemini call failed after {} retries", maxRetries, lastException);
        throw new GeminiException("AI_SERVICE_UNAVAILABLE",
                "AI service is temporarily unavailable. Please try again later.");
    }

    /**
     * Generate content and parse the response as JSON.
     */
    public JsonNode generateStructuredContent(String systemInstruction, String userPrompt) {
        return generateStructuredContent(systemInstruction, userPrompt, false);
    }

    public JsonNode generateStructuredContent(String systemInstruction, String userPrompt, boolean useSentimentModel) {
        String text = generateContent(systemInstruction, userPrompt, useSentimentModel);

        // Strip markdown code fences if present
        String cleaned = text.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        cleaned = cleaned.trim();

        try {
            return objectMapper.readTree(cleaned);
        } catch (JsonProcessingException e) {
            logger.error("Failed to parse Gemini response as JSON: {}", cleaned.substring(0, Math.min(200, cleaned.length())));
            throw new GeminiException("AI_INVALID_RESPONSE",
                    "AI returned an invalid response format. Please try again.");
        }
    }

    private Map<String, Object> buildRequestBody(String systemInstruction, String userPrompt) {
        Map<String, Object> body = new LinkedHashMap<>();

        // System instruction
        if (systemInstruction != null && !systemInstruction.isBlank()) {
            Map<String, Object> systemInstr = new LinkedHashMap<>();
            Map<String, String> systemPart = Map.of("text", systemInstruction);
            systemInstr.put("parts", List.of(systemPart));
            body.put("systemInstruction", systemInstr);
        }

        // User content
        Map<String, Object> userContent = new LinkedHashMap<>();
        userContent.put("role", "user");
        userContent.put("parts", List.of(Map.of("text", userPrompt)));

        body.put("contents", List.of(userContent));

        // Generation config
        Map<String, Object> genConfig = new LinkedHashMap<>();
        genConfig.put("temperature", 0.3);
        genConfig.put("maxOutputTokens", 2048);
        body.put("generationConfig", genConfig);

        return body;
    }

    private String extractTextFromResponse(String responseBody) throws JsonProcessingException {
        JsonNode root = objectMapper.readTree(responseBody);
        JsonNode candidates = root.path("candidates");
        if (candidates.isArray() && !candidates.isEmpty()) {
            JsonNode parts = candidates.get(0).path("content").path("parts");
            if (parts.isArray() && !parts.isEmpty()) {
                String text = parts.get(0).path("text").asText("");
                if (!text.isBlank()) {
                    return text;
                }
            }
        }

        // Check for error
        JsonNode error = root.path("error");
        if (!error.isMissingNode()) {
            String message = error.path("message").asText("Unknown error");
            int code = error.path("code").asInt(500);
            if (code == 429) {
                throw new GeminiException("AI_RATE_LIMITED", "AI service rate limit reached. Please wait a moment.");
            }
            logger.error("Gemini API error: code={}, message={}", code, message);
            throw new GeminiException("AI_SERVICE_UNAVAILABLE", "AI service error. Please try again.");
        }

        throw new GeminiException("AI_INVALID_RESPONSE", "AI returned an empty response.");
    }

    /**
     * Custom exception for Gemini-related errors.
     */
    public static class GeminiException extends RuntimeException {
        private final String errorCode;

        public GeminiException(String errorCode, String message) {
            super(message);
            this.errorCode = errorCode;
        }

        public String getErrorCode() {
            return errorCode;
        }
    }
}
