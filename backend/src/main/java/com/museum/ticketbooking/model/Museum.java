package com.museum.ticketbooking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;

@Entity
@Table(name = "museums")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Museum {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "museum_name", nullable = false)
    private String museumName;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    @JsonIgnore   // never leak password in API responses
    private String password;

    private String location;

    // ── Ticket prices ──
    @Column(name = "adult_price")
    private Double adultPrice;

    @Column(name = "child_price")
    private Double childPrice;

    // Aliases so frontend can access by either name
    public Double getAdultTicketPrice() { return adultPrice; }
    public Double getChildTicketPrice() { return childPrice; }

    // Also provide direct getters for service layer
    public Double getAdultPrice() { return adultPrice; }
    public Double getChildPrice() { return childPrice; }

    @Column(name = "seat_limit")
    private Integer seatLimit;

    // ── Museum timings (stored as HH:mm strings) ──
    @Column(name = "opening_time", length = 10)
    private String openingTime = "09:00";

    @Column(name = "closing_time", length = 10)
    private String closingTime = "17:00";

    // ── Permanent 4-digit staff validation PIN ──
    @Column(name = "staff_pin", length = 4, nullable = false)
    private String staffPin;

    @Column(name = "verification_code")
    private String verificationCode;

    @Column(name = "booking_status")
    private Boolean bookingStatus = true;

    @Column(unique = true)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String tagline;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String category;
    
    @Column(name = "cover_image_url")
    private String coverImageUrl;

    @Column(name = "display_image_url")
    private String displayImageUrl;

    @Column(name = "public_phone")
    private String publicPhone;

    @Column(name = "public_email")
    private String publicEmail;

    @Column(name = "website_url")
    private String websiteUrl;

    @Column(name = "instagram_url")
    private String instagramUrl;

    @Column(name = "facebook_url")
    private String facebookUrl;

    @Column(name = "youtube_url")
    private String youtubeUrl;

    private String address;
    private String landmark;
    private String city;
    private String state;
    private String pincode;

    private Double latitude;
    private Double longitude;

    @Transient
    private Double distance; // calculated distance in km

    @Column(name = "accessibility_notes", columnDefinition = "TEXT")
    private String accessibilityNotes;

    @Column(name = "visitor_guidelines", columnDefinition = "TEXT")
    private String visitorGuidelines;

    @Column(name = "recommended_duration_minutes")
    private Integer recommendedDurationMinutes;

    @Column(name = "established_year")
    private Integer establishedYear;

    @Column(name = "profile_published")
    private Boolean profilePublished = false;

    @Column(name = "public_view_count")
    private Long publicViewCount = 0L;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (staffPin == null || staffPin.isBlank()) {
            staffPin = String.format("%04d", (int) (Math.random() * 9000 + 1000));
        }
        if (verificationCode == null) {
            verificationCode = "MUS" + String.format("%04d", (int) (Math.random() * 10000));
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
