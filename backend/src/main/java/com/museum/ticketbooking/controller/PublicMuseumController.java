package com.museum.ticketbooking.controller;

import com.museum.ticketbooking.dto.MuseumSearchRequest;
import com.museum.ticketbooking.dto.PublicMuseumDetailDTO;
import com.museum.ticketbooking.dto.PublicMuseumListDTO;
import com.museum.ticketbooking.model.MuseumReview;
import com.museum.ticketbooking.service.PublicMuseumService;
import com.museum.ticketbooking.service.ReviewService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public/museums")
@CrossOrigin(origins = "http://localhost:5173")
public class PublicMuseumController {

    private final PublicMuseumService publicMuseumService;
    private final ReviewService reviewService;

    public PublicMuseumController(PublicMuseumService publicMuseumService, ReviewService reviewService) {
        this.publicMuseumService = publicMuseumService;
        this.reviewService = reviewService;
    }

    @GetMapping
    public ResponseEntity<List<PublicMuseumListDTO>> searchMuseums(@ModelAttribute MuseumSearchRequest request) {
        return ResponseEntity.ok(publicMuseumService.searchMuseums(request));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<PublicMuseumDetailDTO> getMuseumProfile(@PathVariable String slug) {
        return ResponseEntity.ok(publicMuseumService.getMuseumBySlug(slug));
    }

    @GetMapping("/{slug}/reviews")
    public ResponseEntity<Page<MuseumReview>> getMuseumReviews(@PathVariable String slug,
                                                               @RequestParam(defaultValue = "0") int page,
                                                               @RequestParam(defaultValue = "10") int size) {
        PublicMuseumDetailDTO museum = publicMuseumService.getMuseumBySlug(slug);
        return ResponseEntity.ok(reviewService.getMuseumReviews(museum.getId(), page, size));
    }

    @PostMapping("/{slug}/profile-view")
    public ResponseEntity<?> trackProfileView(@PathVariable String slug) {
        PublicMuseumDetailDTO museum = publicMuseumService.getMuseumBySlug(slug);
        publicMuseumService.trackProfileView(museum.getId());
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/{museumId}/reviews")
    public ResponseEntity<MuseumReview> submitReview(@PathVariable Long museumId,
                                                     @RequestBody Map<String, Object> payload) {
        Long ticketId = null;
        if (payload.containsKey("ticketId") && payload.get("ticketId") != null) {
            try {
                String str = payload.get("ticketId").toString().replaceAll("\\D+", "");
                if (!str.isEmpty()) ticketId = Long.parseLong(str);
            } catch (Exception e) {
                // ignore invalid ticket IDs
            }
        }
        
        String visitorEmail = (String) payload.get("visitorEmail");
        String visitorName = (String) payload.get("visitorName");
        Integer rating = (Integer) payload.get("rating");
        String title = (String) payload.get("title");
        String content = (String) payload.get("content");

        MuseumReview review = reviewService.createReview(museumId, ticketId, visitorEmail, visitorName, rating, title, content);
        return ResponseEntity.ok(review);
    }

    @GetMapping("/visitor-reviews")
    public ResponseEntity<List<Map<String, Object>>> getVisitorReviewsByEmail(@RequestParam String email) {
        return ResponseEntity.ok(reviewService.getVisitorReviews(email));
    }

    @PutMapping("/reviews/{reviewId}")
    public ResponseEntity<MuseumReview> updateReviewPublic(@PathVariable Long reviewId,
                                                           @RequestBody Map<String, Object> payload) {
        String email = (String) payload.get("visitorEmail");
        Integer rating = payload.get("rating") != null ? Integer.parseInt(payload.get("rating").toString()) : null;
        String title = (String) payload.get("title");
        String content = (String) payload.get("content");
        return ResponseEntity.ok(reviewService.updateVisitorReview(reviewId, email, rating, title, content));
    }
}
