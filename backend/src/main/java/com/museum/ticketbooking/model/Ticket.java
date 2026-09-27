package com.museum.ticketbooking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "tickets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_number", unique = true)
    private String ticketNumber;

    // Use JsonIgnoreProperties to avoid infinite recursion; only expose needed museum fields
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "museum_id")
    @JsonIgnoreProperties({"password", "staffPin", "verificationCode", "tickets", "createdAt", "updatedAt"})
    private Museum museum;

    /** Linked visitor account (nullable for legacy tickets) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visitor_id")
    @JsonIgnore
    private Visitor visitor;

    @Column(name = "user_email")
    private String userEmail;

    /** Kept nullable for legacy data; never collected from new bookings */
    private String phone;

    private Integer adults;

    private Integer children;

    @Column(name = "total_visitors")
    private Integer totalVisitors = 0;

    @Column(name = "admitted_visitors")
    private Integer admittedVisitors = 0;

    @Column(name = "total_price")
    private Double totalPrice;

    @Column(name = "payment_id")
    private String paymentId;

    @Column(name = "order_id")
    private String orderId;

    @Column(name = "secret_code")
    private String secretCode;

    private String status;

    /** Secure public token for sharing tickets */
    @Column(name = "public_token", unique = true, length = 64)
    private String publicToken;

    @Column(name = "booked_date")
    private LocalDate bookedDate;

    @Column(name = "slot_start")
    private LocalTime slotStart;

    @Column(name = "slot_end")
    private LocalTime slotEnd;

    @Column(name = "refund_amount")
    private Double refundAmount;

    @Column(name = "refund_status", length = 30)
    private String refundStatus;

    @Column(name = "idempotency_key", length = 64)
    private String idempotencyKey;

    /** Optimistic locking for concurrent partial entry */
    @Version
    @Column(name = "version")
    private Integer version = 0;

    @Column(name = "email_sent")
    private Boolean emailSent = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /* ── Convenience getters used by frontend ── */

    /** Returns the museum's ID, or null if no museum attached */
    public Long getMuseumId() {
        return museum != null ? museum.getId() : null;
    }

    /** Returns the museum's name for display in history panel */
    public String getMuseumName() {
        return museum != null ? museum.getMuseumName() : null;
    }

    /** Returns visitor ID if linked */
    public Long getVisitorId() {
        return visitor != null ? visitor.getId() : null;
    }

    /** Remaining visitors that can still enter */
    public int getRemainingVisitors() {
        int total = totalVisitors != null ? totalVisitors : 0;
        int admitted = admittedVisitors != null ? admittedVisitors : 0;
        return Math.max(0, total - admitted);
    }

    /** Whether the ticket has expired based on booked date and slot */
    public boolean isExpired() {
        LocalDate d = bookedDate != null ? bookedDate : (createdAt != null ? createdAt.toLocalDate() : null);
        if (d == null) return false;
        LocalDate today = LocalDate.now();
        if (d.isBefore(today)) return true;
        if (d.equals(today) && slotEnd != null) {
            return LocalTime.now().isAfter(slotEnd);
        }
        return false;
    }

    /** Compute effective status considering expiry */
    public String getEffectiveStatus() {
        if ("CANCELLED".equalsIgnoreCase(status) || "REFUNDED".equalsIgnoreCase(status)
                || "USED".equalsIgnoreCase(status)) {
            return status;
        }
        if (isExpired() && !"EXPIRED".equalsIgnoreCase(status)) {
            return "EXPIRED";
        }
        return status;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null || status.isBlank()) status = "PENDING";
        if (ticketNumber == null || ticketNumber.isBlank()) {
            ticketNumber = "TKT" + System.currentTimeMillis();
        }
        if (publicToken == null || publicToken.isBlank()) {
            publicToken = UUID.randomUUID().toString().replace("-", "");
        }
        if (totalVisitors == null || totalVisitors == 0) {
            totalVisitors = (adults != null ? adults : 0) + (children != null ? children : 0);
        }
        if (admittedVisitors == null) admittedVisitors = 0;
        if (bookedDate == null) bookedDate = LocalDate.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
