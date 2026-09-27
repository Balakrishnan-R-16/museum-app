package com.museum.ticketbooking.service;

import com.museum.ticketbooking.model.RefundRecord;
import com.museum.ticketbooking.model.Ticket;
import com.museum.ticketbooking.repository.RefundRecordRepository;
import com.museum.ticketbooking.repository.TicketRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class RefundService {

    private final TicketRepository ticketRepository;
    private final RefundRecordRepository refundRecordRepository;

    public RefundService(TicketRepository ticketRepository,
                         RefundRecordRepository refundRecordRepository) {
        this.ticketRepository = ticketRepository;
        this.refundRecordRepository = refundRecordRepository;
    }

    /**
     * Calculate refund eligibility and amount for a ticket.
     * Rules:
     *   ≥24h before visit date → 100% refund
     *   <24h but before visit date → 75% refund
     *   After slot start → no refund (cancellation rejected)
     */
    public Map<String, Object> calculateRefund(Ticket ticket) {
        Map<String, Object> result = new HashMap<>();

        if (!"ACTIVE".equalsIgnoreCase(ticket.getStatus())
                && !"PARTIALLY_USED".equalsIgnoreCase(ticket.getStatus())) {
            result.put("eligible", false);
            result.put("reason", "Only active or partially used tickets can be cancelled");
            return result;
        }

        LocalDateTime slotStartDateTime = getSlotStartDateTime(ticket);
        LocalDateTime now = LocalDateTime.now();

        if (now.isAfter(slotStartDateTime)) {
            result.put("eligible", false);
            result.put("reason", "Cannot cancel after the slot has started");
            return result;
        }

        Duration timeUntilSlot = Duration.between(now, slotStartDateTime);
        long hoursUntilSlot = timeUntilSlot.toHours();

        double ticketPrice = ticket.getTotalPrice() != null ? ticket.getTotalPrice() : 0;
        int refundPercentage;
        double refundAmount;

        if (hoursUntilSlot >= 24) {
            refundPercentage = 100;
            refundAmount = ticketPrice;
        } else {
            refundPercentage = 75;
            refundAmount = ticketPrice * 0.75;
        }

        result.put("eligible", true);
        result.put("refundPercentage", refundPercentage);
        result.put("refundAmount", Math.round(refundAmount * 100.0) / 100.0);
        result.put("ticketPrice", ticketPrice);
        result.put("hoursUntilSlot", hoursUntilSlot);
        result.put("minutesUntilSlot", timeUntilSlot.toMinutes());

        return result;
    }

    /**
     * Process the cancellation and create a refund record.
     * Idempotent: if a refund record already exists for this ticket, return it.
     */
    @Transactional
    public Map<String, Object> processCancellation(Ticket ticket) {
        // Generate idempotency key based on ticket
        String idempotencyKey = "cancel_" + ticket.getId() + "_" + ticket.getTicketNumber();

        // Check for existing refund (idempotency)
        if (refundRecordRepository.existsByIdempotencyKey(idempotencyKey)) {
            RefundRecord existing = refundRecordRepository.findByIdempotencyKey(idempotencyKey)
                    .orElseThrow(() -> new RuntimeException("Refund record inconsistency"));
            Map<String, Object> result = new HashMap<>();
            result.put("refundId", existing.getId());
            result.put("refundAmount", existing.getRefundAmount());
            result.put("refundPercentage", existing.getRefundPercentage());
            result.put("refundStatus", existing.getRefundStatus());
            result.put("alreadyProcessed", true);
            return result;
        }

        Map<String, Object> refundCalc = calculateRefund(ticket);
        if (!Boolean.TRUE.equals(refundCalc.get("eligible"))) {
            throw new RuntimeException((String) refundCalc.get("reason"));
        }

        double refundAmount = (double) refundCalc.get("refundAmount");
        int refundPercentage = (int) refundCalc.get("refundPercentage");

        // Create refund record
        RefundRecord record = new RefundRecord();
        record.setTicketId(ticket.getId());
        record.setPaymentReference(ticket.getPaymentId());
        record.setRefundAmount(refundAmount);
        record.setRefundPercentage(refundPercentage);
        record.setIdempotencyKey(idempotencyKey);

        // TODO: In production, call Razorpay refund API here
        // For now, mark as PROCESSED (simulated)
        record.setRefundStatus("PROCESSED");
        record.setProviderResponse("Refund of ₹" + refundAmount + " (" + refundPercentage + "%) initiated");

        RefundRecord saved = refundRecordRepository.save(record);

        // Update ticket status
        ticket.setStatus("CANCELLED");
        ticket.setRefundAmount(refundAmount);
        ticket.setRefundStatus("REFUNDED");
        ticketRepository.save(ticket);

        Map<String, Object> result = new HashMap<>();
        result.put("refundId", saved.getId());
        result.put("refundAmount", refundAmount);
        result.put("refundPercentage", refundPercentage);
        result.put("refundStatus", saved.getRefundStatus());
        result.put("ticketStatus", "CANCELLED");
        result.put("alreadyProcessed", false);
        return result;
    }

    private LocalDateTime getSlotStartDateTime(Ticket ticket) {
        LocalDate date = ticket.getBookedDate() != null ? ticket.getBookedDate() : LocalDate.now();
        LocalTime startTime = ticket.getSlotStart();
        if (startTime == null) {
            // Fallback: use museum opening time or default 09:00
            startTime = LocalTime.of(9, 0);
        }
        return LocalDateTime.of(date, startTime);
    }
}
