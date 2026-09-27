package com.museum.ticketbooking.repository;

import com.museum.ticketbooking.model.AiCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AiCacheRepository extends JpaRepository<AiCache, Long> {
    Optional<AiCache> findByMuseumIdAndCacheKey(Long museumId, String cacheKey);
}
