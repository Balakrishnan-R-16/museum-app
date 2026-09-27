package com.museum.ticketbooking.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
public class TicketRescheduleRequest {

    @NotNull(message = "New date is required")
    private LocalDate newDate;

    private LocalTime newSlotStart;
    
    private LocalTime newSlotEnd;
}
