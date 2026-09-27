package com.museum.ticketbooking.repository;

import com.museum.ticketbooking.model.Museum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface MuseumRepository extends JpaRepository<Museum, Long> {
    Optional<Museum> findByEmail(String email);
    boolean existsByEmail(String email);
    
    @Query("SELECT m FROM Museum m WHERE m.bookingStatus = true ORDER BY m.museumName ASC")
    List<Museum> findAllActiveMuseums();
    
    @Query("SELECT m FROM Museum m ORDER BY m.museumName ASC")
    List<Museum> findAllMuseumsOrdered();
    
    // Haversine formula to calculate distance in km
    @Query(value = "SELECT m.*, " +
           "(6371 * acos(cos(radians(:lat)) * cos(radians(m.latitude)) * cos(radians(m.longitude) - radians(:lon)) + sin(radians(:lat)) * sin(radians(m.latitude)))) AS distance " +
           "FROM museums m " +
           "WHERE m.latitude IS NOT NULL AND m.longitude IS NOT NULL " +
           "AND (6371 * acos(cos(radians(:lat)) * cos(radians(m.latitude)) * cos(radians(m.longitude) - radians(:lon)) + sin(radians(:lat)) * sin(radians(m.latitude)))) <= :radius " +
           "ORDER BY distance ASC", nativeQuery = true)
    List<Museum> findNearbyMuseums(@Param("lat") double lat, @Param("lon") double lon, @Param("radius") double radius);
}
