package com.museum.ticketbooking.repository;

import com.museum.ticketbooking.model.RefundRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RefundRecordRepository extends JpaRepository<RefundRecord, Long> {
    List<RefundRecord> findByTicketId(Long ticketId);
    Optional<RefundRecord> findByIdempotencyKey(String idempotencyKey);
    boolean existsByIdempotencyKey(String idempotencyKey);
}
