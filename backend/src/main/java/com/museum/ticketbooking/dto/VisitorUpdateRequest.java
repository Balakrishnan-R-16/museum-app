package com.museum.ticketbooking.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VisitorUpdateRequest {

    @Size(max = 255, message = "Display name too long")
    private String displayName;

    @Size(min = 8, message = "Password must be at least 8 characters")
    private String newPassword;

    /** Required when changing password for LOCAL auth accounts */
    private String currentPassword;
}
