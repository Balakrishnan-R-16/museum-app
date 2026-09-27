package com.museum.ticketbooking.service;

import com.museum.ticketbooking.dto.MuseumSearchRequest;
import com.museum.ticketbooking.dto.PublicMuseumDetailDTO;
import com.museum.ticketbooking.dto.PublicMuseumListDTO;
import com.museum.ticketbooking.model.Museum;
import com.museum.ticketbooking.model.MuseumAmenity;
import com.museum.ticketbooking.repository.MuseumAmenityRepository;
import com.museum.ticketbooking.repository.MuseumBusinessHoursRepository;
import com.museum.ticketbooking.repository.MuseumImageRepository;
import com.museum.ticketbooking.repository.MuseumRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PublicMuseumService {
    
    private final MuseumRepository museumRepository;
    private final MuseumImageRepository imageRepository;
    private final MuseumAmenityRepository amenityRepository;
    private final MuseumBusinessHoursRepository hoursRepository;
    private final ReviewService reviewService;

    public PublicMuseumService(MuseumRepository museumRepository,
                               MuseumImageRepository imageRepository,
                               MuseumAmenityRepository amenityRepository,
                               MuseumBusinessHoursRepository hoursRepository,
                               ReviewService reviewService) {
        this.museumRepository = museumRepository;
        this.imageRepository = imageRepository;
        this.amenityRepository = amenityRepository;
        this.hoursRepository = hoursRepository;
        this.reviewService = reviewService;
    }
    
    public List<PublicMuseumListDTO> searchMuseums(MuseumSearchRequest request) {
        // For MVP, just return all active museums and do basic filtering in memory
        // In production, this would use a JPA Specification or native query
        List<Museum> museums = museumRepository.findAllActiveMuseums();
        
        return museums.stream()
            .map(this::mapToListDTO)
            .collect(Collectors.toList());
    }
    
    @Transactional
    public PublicMuseumDetailDTO getMuseumBySlug(String slug) {
        // Find by slug (or fallback to ID if we don't have a slug lookup yet)
        // For now, iterate to find by slug. We should add findBySlug to repository.
        Museum museum = museumRepository.findAll().stream()
            .filter(m -> slug.equals(m.getSlug()) || slug.equals(String.valueOf(m.getId())))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Museum not found"));
            
        return mapToDetailDTO(museum);
    }
    
    @Transactional
    public PublicMuseumDetailDTO getMuseumById(Long id) {
        Museum museum = museumRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Museum not found"));
            
        return mapToDetailDTO(museum);
    }
    
    @Transactional
    public void trackProfileView(Long museumId) {
        Museum museum = museumRepository.findById(museumId)
            .orElseThrow(() -> new RuntimeException("Museum not found"));
            
        Long currentViews = museum.getPublicViewCount() == null ? 0L : museum.getPublicViewCount();
        museum.setPublicViewCount(currentViews + 1);
        museumRepository.save(museum);
    }
    
    private PublicMuseumListDTO mapToListDTO(Museum m) {
        PublicMuseumListDTO dto = new PublicMuseumListDTO();
        dto.setId(m.getId());
        dto.setSlug(m.getSlug() != null ? m.getSlug() : String.valueOf(m.getId()));
        dto.setMuseumName(m.getMuseumName());
        dto.setCategory(m.getCategory());
        dto.setTagline(m.getTagline());
        dto.setCity(m.getCity());
        dto.setLocation(m.getLocation());
        dto.setCoverImageUrl(m.getCoverImageUrl());
        dto.setDisplayImageUrl(m.getDisplayImageUrl());
        dto.setAdultPrice(m.getAdultPrice());
        dto.setChildPrice(m.getChildPrice());
        dto.setOpeningTime(m.getOpeningTime());
        dto.setClosingTime(m.getClosingTime());
        dto.setBookingStatus(m.getBookingStatus());
        
        dto.setAverageRating(reviewService.getAverageRating(m.getId()));
        dto.setReviewCount(reviewService.getReviewCount(m.getId()));
        
        List<String> amenities = amenityRepository.findByMuseumId(m.getId())
            .stream().map(MuseumAmenity::getAmenityType).collect(Collectors.toList());
        dto.setAmenities(amenities);
        
        dto.setLatitude(m.getLatitude());
        dto.setLongitude(m.getLongitude());
        return dto;
    }
    
    private PublicMuseumDetailDTO mapToDetailDTO(Museum m) {
        PublicMuseumDetailDTO dto = new PublicMuseumDetailDTO();
        dto.setId(m.getId());
        dto.setSlug(m.getSlug() != null ? m.getSlug() : String.valueOf(m.getId()));
        dto.setMuseumName(m.getMuseumName());
        dto.setCategory(m.getCategory());
        dto.setTagline(m.getTagline());
        dto.setDescription(m.getDescription());
        dto.setCoverImageUrl(m.getCoverImageUrl());
        dto.setDisplayImageUrl(m.getDisplayImageUrl());
        dto.setAddress(m.getAddress());
        dto.setLandmark(m.getLandmark());
        dto.setCity(m.getCity());
        dto.setState(m.getState());
        dto.setPincode(m.getPincode());
        dto.setLatitude(m.getLatitude());
        dto.setLongitude(m.getLongitude());
        dto.setPublicPhone(m.getPublicPhone());
        dto.setPublicEmail(m.getPublicEmail());
        dto.setWebsiteUrl(m.getWebsiteUrl());
        dto.setInstagramUrl(m.getInstagramUrl());
        dto.setFacebookUrl(m.getFacebookUrl());
        dto.setYoutubeUrl(m.getYoutubeUrl());
        dto.setAccessibilityNotes(m.getAccessibilityNotes());
        dto.setVisitorGuidelines(m.getVisitorGuidelines());
        dto.setRecommendedDurationMinutes(m.getRecommendedDurationMinutes());
        dto.setEstablishedYear(m.getEstablishedYear());
        dto.setAdultPrice(m.getAdultPrice());
        dto.setChildPrice(m.getChildPrice());
        dto.setBookingStatus(m.getBookingStatus());
        dto.setSeatLimit(m.getSeatLimit());
        dto.setOpeningTime(m.getOpeningTime());
        dto.setClosingTime(m.getClosingTime());
        
        dto.setAverageRating(reviewService.getAverageRating(m.getId()));
        dto.setReviewCount(reviewService.getReviewCount(m.getId()));
        dto.setPublicViewCount(m.getPublicViewCount() != null ? m.getPublicViewCount() : 0L);
        
        List<String> amenities = amenityRepository.findByMuseumId(m.getId())
            .stream().map(MuseumAmenity::getAmenityType).collect(Collectors.toList());
        dto.setAmenities(amenities);
        
        dto.setBusinessHours(hoursRepository.findByMuseumIdOrderByDayOfWeekAsc(m.getId()));
        dto.setGalleryImages(imageRepository.findByMuseumIdAndImageTypeOrderBySortOrderAsc(m.getId(), "GALLERY"));
        dto.setCoverImages(imageRepository.findByMuseumIdAndImageTypeOrderBySortOrderAsc(m.getId(), "COVER"));
        
        return dto;
    }
}
