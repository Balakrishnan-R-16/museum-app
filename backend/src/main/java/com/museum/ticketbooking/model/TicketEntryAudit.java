package com.museum.ticketbooking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

/**
 * Records each group entry event for audit trail.
 * Supports partial group entry at the museum gate.
 */
@Entity
@Table(name = "ticket_entry_audit")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TicketEntryAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_id", nullable = false)
    private Long ticketId;

    @Column(name = "staff_user")
    private String staffUser;

    @Column(name = "entry_count", nullable = false)
    private Integer entryCount;

    @Column(name = "prior_admitted", nullable = false)
    private Integer priorAdmitted = 0;

    @Column(name = "resulting_admitted", nullable = false)
    private Integer resultingAdmitted = 0;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) timestamp = LocalDateTime.now();
    }
}
