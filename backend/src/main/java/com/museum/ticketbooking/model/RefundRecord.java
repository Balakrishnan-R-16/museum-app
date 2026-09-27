package com.museum.ticketbooking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

/**
 * Tracks refund operations for cancelled tickets.
 * Uses idempotency key to prevent duplicate refunds.
 */
@Entity
@Table(name = "refund_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RefundRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_id", nullable = false)
    private Long ticketId;

    @Column(name = "payment_reference")
    private String paymentReference;

    @Column(name = "refund_amount", nullable = false)
    private Double refundAmount;

    @Column(name = "refund_percentage")
    private Integer refundPercentage;

    @Column(name = "refund_status", nullable = false, length = 30)
    private String refundStatus = "PENDING";

    @Column(name = "provider_response", columnDefinition = "TEXT")
    private String providerResponse;

    @Column(name = "idempotency_key", unique = true, length = 64)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
