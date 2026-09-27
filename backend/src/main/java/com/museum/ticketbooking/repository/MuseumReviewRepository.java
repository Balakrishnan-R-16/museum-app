package com.museum.ticketbooking.repository;

import com.museum.ticketbooking.model.MuseumReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MuseumReviewRepository extends JpaRepository<MuseumReview, Long> {
    Page<MuseumReview> findByMuseumIdAndStatusOrderByCreatedAtDesc(Long museumId, String status, Pageable pageable);
    List<MuseumReview> findByMuseumIdOrderByCreatedAtDesc(Long museumId);
    List<MuseumReview> findByVisitorEmailOrderByCreatedAtDesc(String visitorEmail);
    
    @Query("SELECT AVG(r.rating) FROM MuseumReview r WHERE r.museumId = :museumId AND r.status = 'PUBLISHED'")
    Double getAverageRating(@Param("museumId") Long museumId);
    
    @Query("SELECT COUNT(r) FROM MuseumReview r WHERE r.museumId = :museumId AND r.status = 'PUBLISHED'")
    Long getReviewCount(@Param("museumId") Long museumId);

    boolean existsByTicketId(Long ticketId);
}
