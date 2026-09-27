package com.museum.ticketbooking.repository;

import com.museum.ticketbooking.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    List<Ticket> findByMuseum_Id(Long museumId);

    List<Ticket> findByMuseum_IdOrderByCreatedAtDesc(Long museumId);

    List<Ticket> findByUserEmailOrderByCreatedAtDesc(String userEmail);

    Optional<Ticket> findByTicketNumber(String ticketNumber);

    Optional<Ticket> findByOrderId(String orderId);

    Optional<Ticket> findByPublicToken(String publicToken);

    List<Ticket> findByMuseum_IdAndPhoneOrderByCreatedAtDesc(Long museumId, String phone);

    /** Find tickets belonging to a specific visitor */
    List<Ticket> findByVisitor_IdOrderByCreatedAtDesc(Long visitorId);

    /** Find tickets by visitor and status */
    List<Ticket> findByVisitor_IdAndStatusOrderByCreatedAtDesc(Long visitorId, String status);

    /** Find active/partially-used tickets for a visitor (for cancellation page) */
    @Query("SELECT t FROM Ticket t WHERE t.visitor.id = :visitorId AND t.status IN ('ACTIVE', 'PARTIALLY_USED') ORDER BY t.bookedDate ASC, t.slotStart ASC")
    List<Ticket> findCancellableByVisitorId(@Param("visitorId") Long visitorId);

    @Query("SELECT t FROM Ticket t WHERE t.museum.id = :museumId AND t.status = :status ORDER BY t.createdAt DESC")
    List<Ticket> findByMuseumIdAndStatus(@Param("museumId") Long museumId, @Param("status") String status);

    @Query(value = "SELECT COUNT(*) FROM tickets t WHERE t.museum_id = :museumId AND CAST(t.created_at AS DATE) = CURRENT_DATE", nativeQuery = true)
    Long countTodayTickets(@Param("museumId") Long museumId);

    @Query(value = "SELECT COALESCE(SUM(t.total_price), 0) FROM tickets t WHERE t.museum_id = :museumId AND CAST(t.created_at AS DATE) = CURRENT_DATE", nativeQuery = true)
    Double getTodayRevenue(@Param("museumId") Long museumId);

    @Query(value = "SELECT * FROM tickets t WHERE t.museum_id = :museumId AND CAST(t.created_at AS DATE) = :date ORDER BY t.created_at DESC", nativeQuery = true)
    List<Ticket> findTodayTicketsByMuseumId(@Param("museumId") Long museumId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.museum.id = :museumId AND t.status = 'ACTIVE'")
    Long countActiveTickets(@Param("museumId") Long museumId);

    List<Ticket> findByMuseum_IdAndCreatedAtAfterOrderByCreatedAtAsc(Long museumId, java.time.LocalDateTime startDate);

    /** Atomically increment admitted_visitors — returns updated row count (1 = success, 0 = conflict) */
    @Modifying
    @Query("UPDATE Ticket t SET t.admittedVisitors = t.admittedVisitors + :count, " +
           "t.status = CASE WHEN (t.admittedVisitors + :count) >= t.totalVisitors THEN 'USED' ELSE 'PARTIALLY_USED' END, " +
           "t.usedAt = CASE WHEN (t.admittedVisitors + :count) >= t.totalVisitors THEN CURRENT_TIMESTAMP ELSE t.usedAt END, " +
           "t.updatedAt = CURRENT_TIMESTAMP " +
           "WHERE t.id = :ticketId AND t.admittedVisitors = :expectedAdmitted " +
           "AND (t.admittedVisitors + :count) <= t.totalVisitors")
    int atomicAdmitVisitors(@Param("ticketId") Long ticketId,
                            @Param("count") int count,
                            @Param("expectedAdmitted") int expectedAdmitted);

    /** Mark expired tickets — scheduled batch job */
    @Modifying
    @Query("UPDATE Ticket t SET t.status = 'EXPIRED', t.updatedAt = CURRENT_TIMESTAMP " +
           "WHERE t.status IN ('ACTIVE', 'PARTIALLY_USED', 'PENDING') " +
           "AND t.bookedDate < :today")
    int markExpiredTickets(@Param("today") LocalDate today);

    /** Count booked visitors for a museum on a specific date and slot */
    @Query("SELECT COALESCE(SUM(t.totalVisitors), 0) FROM Ticket t " +
           "WHERE t.museum.id = :museumId AND t.bookedDate = :date " +
           "AND t.slotStart = :slotStart AND t.slotEnd = :slotEnd " +
           "AND t.status IN ('ACTIVE', 'PARTIALLY_USED', 'PENDING')")
    int countBookedVisitorsForSlot(@Param("museumId") Long museumId,
                                   @Param("date") LocalDate date,
                                   @Param("slotStart") java.time.LocalTime slotStart,
                                   @Param("slotEnd") java.time.LocalTime slotEnd);

    /** Count booked visitors for a museum on a specific date */
    @Query("SELECT COALESCE(SUM(t.totalVisitors), 0) FROM Ticket t " +
           "WHERE t.museum.id = :museumId AND t.bookedDate = :date " +
           "AND t.status IN ('ACTIVE', 'PARTIALLY_USED', 'PENDING')")
    int countBookedVisitorsForDate(@Param("museumId") Long museumId,
                                   @Param("date") LocalDate date);
}
