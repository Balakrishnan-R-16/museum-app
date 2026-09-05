package com.museum.ticketbooking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AiBusinessQueryRequest {

    @NotBlank(message = "question is required")
    @Size(max = 500, message = "question must be under 500 characters")
    private String question;

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }
}
