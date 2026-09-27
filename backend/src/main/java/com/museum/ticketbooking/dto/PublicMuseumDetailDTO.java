package com.museum.ticketbooking.dto;

import com.museum.ticketbooking.model.MuseumBusinessHours;
import com.museum.ticketbooking.model.MuseumImage;
import lombok.Data;
import java.util.List;

@Data
public class PublicMuseumDetailDTO {
    private Long id;
    private String slug;
    private String museumName;
    private String category;
    private String tagline;
    private String description;
    
    private String coverImageUrl;
    private String displayImageUrl;
    
    private String address;
    private String landmark;
    private String city;
    private String state;
    private String pincode;
    
    private Double latitude;
    private Double longitude;
    
    private String publicPhone;
    private String publicEmail;
    private String websiteUrl;
    
    private String instagramUrl;
    private String facebookUrl;
    private String youtubeUrl;
    
    private String accessibilityNotes;
    private String visitorGuidelines;
    private Integer recommendedDurationMinutes;
    private Integer establishedYear;
    
    private Double adultPrice;
    private Double childPrice;
    
    private Boolean bookingStatus;
    private Integer seatLimit;
    
    private String openingTime;
    private String closingTime;
    
    private Double averageRating;
    private Long reviewCount;
    private Long publicViewCount;
    
    private List<String> amenities;
    private List<MuseumBusinessHours> businessHours;
    private List<MuseumImage> galleryImages;
    private List<MuseumImage> coverImages;
}
