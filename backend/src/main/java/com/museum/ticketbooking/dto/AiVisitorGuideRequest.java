package com.museum.ticketbooking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class AiVisitorGuideRequest {

    @NotNull(message = "museumId is required")
    private Long museumId;

    @NotBlank(message = "question is required")
    @Size(max = 500, message = "question must be under 500 characters")
    private String question;

    @NotBlank(message = "language is required")
    @Size(max = 5, message = "invalid language code")
    private String lang;

    public Long getMuseumId() { return museumId; }
    public void setMuseumId(Long museumId) { this.museumId = museumId; }
    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }
    public String getLang() { return lang; }
    public void setLang(String lang) { this.lang = lang; }
}
