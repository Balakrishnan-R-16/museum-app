package com.museum.ticketbooking.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class MuseumRegistrationDTO {
    @NotBlank(message = "Museum name is required")
    private String museumName;
    
    @NotBlank(message = "Location is required")
    private String location;
    
    @Email(message = "Invalid email format")
    @NotBlank(message = "Email is required")
    private String email;
    
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;
    
    @NotNull(message = "Seat capacity is required")
    @Min(value = 1, message = "Seat capacity must be at least 1")
    private Integer seatCapacity;
    
    @NotNull(message = "Adult ticket price is required")
    @Min(value = 0, message = "Price cannot be negative")
    private Double adultTicketPrice;
    
    @NotNull(message = "Child ticket price is required")
    @Min(value = 0, message = "Price cannot be negative")
    private Double childTicketPrice;
    
    // Optional Google ID token for sign-up without password
    private String idToken;
}
