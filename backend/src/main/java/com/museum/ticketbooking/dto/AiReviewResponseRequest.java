package com.museum.ticketbooking.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class AiReviewResponseRequest {

    @NotNull(message = "reviewId is required")
    private Long reviewId;

    @Size(max = 50, message = "invalid tone")
    private String tone = "professional";

    public Long getReviewId() { return reviewId; }
    public void setReviewId(Long reviewId) { this.reviewId = reviewId; }
    public String getTone() { return tone; }
    public void setTone(String tone) { this.tone = tone; }
}
