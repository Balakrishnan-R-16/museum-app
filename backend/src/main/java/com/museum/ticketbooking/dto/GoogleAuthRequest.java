package com.museum.ticketbooking.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GoogleAuthRequest {

    @NotBlank(message = "Google ID token is required")
    private String idToken;
}
