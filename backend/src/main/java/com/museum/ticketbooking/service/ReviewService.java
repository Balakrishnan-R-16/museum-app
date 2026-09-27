package com.museum.ticketbooking.service;

import com.museum.ticketbooking.model.MuseumReview;
import com.museum.ticketbooking.model.ReviewResponse;
import com.museum.ticketbooking.model.Ticket;
import com.museum.ticketbooking.repository.MuseumReviewRepository;
import com.museum.ticketbooking.repository.ReviewResponseRepository;
import com.museum.ticketbooking.repository.TicketRepository;
import com.museum.ticketbooking.repository.MuseumRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ReviewService {
    
    private final MuseumReviewRepository reviewRepository;
    private final ReviewResponseRepository responseRepository;
    private final TicketRepository ticketRepository;
    private final MuseumRepository museumRepository;

    public ReviewService(MuseumReviewRepository reviewRepository, 
                         ReviewResponseRepository responseRepository,
                         TicketRepository ticketRepository,
                         MuseumRepository museumRepository) {
        this.reviewRepository = reviewRepository;
        this.responseRepository = responseRepository;
        this.ticketRepository = ticketRepository;
        this.museumRepository = museumRepository;
    }
    
    public MuseumReview createReview(Long museumId, Long ticketId, String visitorEmail, String visitorName, Integer rating, String title, String content) {
        if (ticketId != null) {
            // Validate ticket ownership and usage
            Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
                
            if (!ticket.getMuseumId().equals(museumId)) {
                throw new RuntimeException("Ticket does not belong to this museum");
            }
            
            if (!ticket.getUserEmail().equalsIgnoreCase(visitorEmail)) {
                throw new RuntimeException("Email does not match ticket owner");
            }
            
            if (!"USED".equalsIgnoreCase(ticket.getStatus())) {
                throw new RuntimeException("You can only review a museum after you have visited (ticket must be marked as USED)");
            }
            
            if (reviewRepository.existsByTicketId(ticketId)) {
                throw new RuntimeException("A review has already been submitted for this ticket");
            }
        }
        
        if (rating < 1 || rating > 5) {
            throw new RuntimeException("Rating must be between 1 and 5");
        }
        
        MuseumReview review = new MuseumReview();
        review.setMuseumId(museumId);
        review.setTicketId(ticketId);
        review.setVisitorEmail(visitorEmail);
        review.setVisitorName(visitorName);
        review.setRating(rating);
        review.setTitle(title);
        review.setContent(content);
        
        return reviewRepository.save(review);
    }
    
    public Page<MuseumReview> getMuseumReviews(Long museumId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return reviewRepository.findByMuseumIdAndStatusOrderByCreatedAtDesc(museumId, "PUBLISHED", pageable);
    }
    
    public ReviewResponse addResponse(Long reviewId, Long museumId, String responseText) {
        MuseumReview review = reviewRepository.findById(reviewId)
            .orElseThrow(() -> new RuntimeException("Review not found"));
            
        if (!review.getMuseumId().equals(museumId)) {
            throw new RuntimeException("Review does not belong to this museum");
        }
        
        Optional<ReviewResponse> existing = responseRepository.findByReviewId(reviewId);
        ReviewResponse response = existing.orElse(new ReviewResponse());
        
        response.setReviewId(reviewId);
        response.setMuseumId(museumId);
        response.setResponseText(responseText);
        
        return responseRepository.save(response);
    }
    
    public Double getAverageRating(Long museumId) {
        Double avg = reviewRepository.getAverageRating(museumId);
        return avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0;
    }
    
    public Long getReviewCount(Long museumId) {
        return reviewRepository.getReviewCount(museumId);
    }

    public List<Map<String, Object>> getVisitorReviews(String visitorEmail) {
        List<MuseumReview> reviews = reviewRepository.findByVisitorEmailOrderByCreatedAtDesc(visitorEmail);
        return reviews.stream().map(r -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId());
            map.put("museumId", r.getMuseumId());
            map.put("ticketId", r.getTicketId());
            map.put("visitorEmail", r.getVisitorEmail());
            map.put("visitorName", r.getVisitorName());
            map.put("rating", r.getRating());
            map.put("title", r.getTitle());
            map.put("content", r.getContent());
            map.put("status", r.getStatus());
            map.put("createdAt", r.getCreatedAt());
            map.put("updatedAt", r.getUpdatedAt());

            museumRepository.findById(r.getMuseumId()).ifPresent(m -> {
                map.put("museumName", m.getMuseumName());
            });
            return map;
        }).collect(Collectors.toList());
    }

    public MuseumReview updateVisitorReview(Long reviewId, String visitorEmail, Integer rating, String title, String content) {
        MuseumReview review = reviewRepository.findById(reviewId)
            .orElseThrow(() -> new RuntimeException("Review not found"));

        if (review.getVisitorEmail() == null || !review.getVisitorEmail().equalsIgnoreCase(visitorEmail)) {
            throw new RuntimeException("You can only edit your own reviews");
        }

        if (rating != null) {
            if (rating < 1 || rating > 5) {
                throw new RuntimeException("Rating must be between 1 and 5");
            }
            review.setRating(rating);
        }
        if (title != null) {
            review.setTitle(title);
        }
        if (content != null) {
            review.setContent(content);
        }

        return reviewRepository.save(review);
    }
}
