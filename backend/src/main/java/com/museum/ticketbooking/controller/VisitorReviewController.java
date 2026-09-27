package com.museum.ticketbooking.controller;

import com.museum.ticketbooking.dto.ApiResponse;
import com.museum.ticketbooking.model.MuseumReview;
import com.museum.ticketbooking.model.Visitor;
import com.museum.ticketbooking.repository.VisitorRepository;
import com.museum.ticketbooking.service.ReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/visitor/reviews")
@CrossOrigin(origins = "http://localhost:5173")
public class VisitorReviewController {

    private final ReviewService reviewService;
    private final VisitorRepository visitorRepository;

    public VisitorReviewController(ReviewService reviewService, VisitorRepository visitorRepository) {
        this.reviewService = reviewService;
        this.visitorRepository = visitorRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMyReviews(@RequestAttribute(value = "userId", required = false) String userId) {
        if (userId == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Session expired. Please log in again."));
        }
        try {
            Long visitorId = Long.parseLong(userId);
            Visitor visitor = visitorRepository.findById(visitorId)
                    .orElseThrow(() -> new RuntimeException("Visitor not found"));

            List<Map<String, Object>> reviews = reviewService.getVisitorReviews(visitor.getEmail());
            return ResponseEntity.ok(ApiResponse.success("Reviews retrieved", reviews));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MuseumReview>> updateReview(
            @RequestAttribute(value = "userId", required = false) String userId,
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
        if (userId == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Session expired. Please log in again."));
        }
        try {
            Long visitorId = Long.parseLong(userId);
            Visitor visitor = visitorRepository.findById(visitorId)
                    .orElseThrow(() -> new RuntimeException("Visitor not found"));

            Integer rating = payload.get("rating") != null ? Integer.parseInt(payload.get("rating").toString()) : null;
            String title = (String) payload.get("title");
            String content = (String) payload.get("content");

            MuseumReview updated = reviewService.updateVisitorReview(id, visitor.getEmail(), rating, title, content);
            return ResponseEntity.ok(ApiResponse.success("Review updated successfully", updated));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
