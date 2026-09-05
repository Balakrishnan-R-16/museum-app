package com.museum.ticketbooking.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDateTime;

/**
 * Unified AI response wrapper. Every AI endpoint returns this structure.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AiResponse<T> {

    private boolean success;
    private T data;
    private String errorCode;
    private String message;
    private String source;
    private LocalDateTime generatedAt;

    // ── Static factory methods ──

    public static <T> AiResponse<T> ok(T data, String source) {
        AiResponse<T> r = new AiResponse<>();
        r.success = true;
        r.data = data;
        r.source = source;
        r.generatedAt = LocalDateTime.now();
        return r;
    }

    public static <T> AiResponse<T> error(String errorCode, String message) {
        AiResponse<T> r = new AiResponse<>();
        r.success = false;
        r.errorCode = errorCode;
        r.message = message;
        r.generatedAt = LocalDateTime.now();
        return r;
    }

    // ── Getters / Setters ──

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public T getData() { return data; }
    public void setData(T data) { this.data = data; }
    public String getErrorCode() { return errorCode; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public LocalDateTime getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(LocalDateTime generatedAt) { this.generatedAt = generatedAt; }
}
