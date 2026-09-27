package com.museum.ticketbooking.repository;

import com.museum.ticketbooking.model.TicketEntryAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TicketEntryAuditRepository extends JpaRepository<TicketEntryAudit, Long> {
    List<TicketEntryAudit> findByTicketIdOrderByTimestampDesc(Long ticketId);
}
