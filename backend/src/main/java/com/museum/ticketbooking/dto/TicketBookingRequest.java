package com.museum.ticketbooking.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * DTO for booking a museum entry ticket from the chatbot.
 * Phone is now optional. VisitorId links to authenticated visitor.
 */
@Getter
@Setter
public class TicketBookingRequest {

    @NotNull(message = "Museum ID is required")
    private Long museumId;

    @Email(message = "Invalid email format")
    @NotBlank(message = "User email is required")
    private String email;

    // alias getter so service code using getUserEmail() still works
    public String getUserEmail() { return email; }

    /** Phone is now optional — not collected from new visitors */
    private String phone;

    @Min(value = 0, message = "Adults count cannot be negative")
    private Integer adults = 0;

    @Min(value = 0, message = "Children count cannot be negative")
    private Integer children = 0;

    /** Optional: link ticket to an authenticated visitor */
    private Long visitorId;

    /** Optional: specific booked date (defaults to today) */
    private LocalDate bookedDate;

    /** Optional: slot start time */
    private LocalTime slotStart;

    /** Optional: slot end time */
    private LocalTime slotEnd;

    // Manual getters/setters for Lombok compatibility
    public Long getMuseumId() { return museumId; }
    public void setMuseumId(Long museumId) { this.museumId = museumId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Integer getAdults() { return adults; }
    public void setAdults(Integer adults) { this.adults = adults; }

    public Integer getChildren() { return children; }
    public void setChildren(Integer children) { this.children = children; }
}
