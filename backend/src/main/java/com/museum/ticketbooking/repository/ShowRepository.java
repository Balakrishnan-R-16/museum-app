package com.museum.ticketbooking.repository;

import com.museum.ticketbooking.model.Show;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ShowRepository extends JpaRepository<Show, Long> {
    List<Show> findByMuseum_Id(Long museumId);
    List<Show> findByMuseum_IdAndStatus(Long museumId, String status);
    
    @Query("SELECT s FROM Show s WHERE s.museum.id = :museumId AND s.showTime > :currentTime AND s.status = 'ACTIVE'")
    List<Show> findUpcomingShows(@Param("museumId") Long museumId, @Param("currentTime") LocalDateTime currentTime);
    
    @Query("SELECT COUNT(st) FROM ShowTicket st WHERE st.show.id = :showId")
    Integer countBookedTickets(@Param("showId") Long showId);
    
    Long countByMuseumId(Long museumId);

    @Query("SELECT s FROM Show s WHERE s.museum.id = :museumId AND s.status = 'ACTIVE'")
    List<Show> findActiveShowsByMuseumId(@Param("museumId") Long museumId);
}
