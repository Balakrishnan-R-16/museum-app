package com.museum.ticketbooking.controller;

import com.museum.ticketbooking.dto.*;
import com.museum.ticketbooking.model.Ticket;
import com.museum.ticketbooking.model.Visitor;
import com.museum.ticketbooking.repository.TicketRepository;
import com.museum.ticketbooking.repository.VisitorRepository;
import com.museum.ticketbooking.service.RefundService;
import com.museum.ticketbooking.service.TicketService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Authenticated visitor ticket endpoints.
 * All endpoints require ROLE_VISITOR JWT.
 * Ownership is enforced: visitors can only access their own tickets.
 */
@RestController
@RequestMapping("/api/visitor/tickets")
@CrossOrigin(origins = "http://localhost:5173")
public class VisitorTicketController {

    private final TicketRepository ticketRepository;
    private final VisitorRepository visitorRepository;
    private final TicketService ticketService;
    private final RefundService refundService;

    public VisitorTicketController(TicketRepository ticketRepository,
                                   VisitorRepository visitorRepository,
                                   TicketService ticketService,
                                   RefundService refundService) {
        this.ticketRepository = ticketRepository;
        this.visitorRepository = visitorRepository;
        this.ticketService = ticketService;
        this.refundService = refundService;
    }

    /* ── GET /api/visitor/tickets — list own tickets with filters ── */
    @Transactional
    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMyTickets(
            @RequestAttribute(value = "userId", required = false) String userId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String period,
            @RequestParam(required = false, defaultValue = "newest") String sort) {
        if (userId == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Session expired. Please log in again."));
        }
        try {
            Long visitorId = Long.parseLong(userId);
            Visitor visitor = visitorRepository.findById(visitorId)
                    .orElseThrow(() -> new RuntimeException("Visitor not found"));

            // 1. Fetch all tickets for visitor + email
            List<Ticket> baseTickets = ticketRepository.findByVisitor_IdOrderByCreatedAtDesc(visitorId);
            List<Ticket> emailTickets = ticketRepository.findByUserEmailOrderByCreatedAtDesc(visitor.getEmail());
            
            // Combine and deduplicate
            Set<Long> ticketIds = new HashSet<>();
            List<Ticket> allTickets = new ArrayList<>();
            
            for (Ticket t : baseTickets) {
                ticketIds.add(t.getId());
                allTickets.add(t);
            }
            
            for (Ticket et : emailTickets) {
                if (!ticketIds.contains(et.getId())) {
                    if (et.getVisitor() == null) {
                        et.setVisitor(visitor);
                        ticketRepository.save(et);
                    }
                    allTickets.add(et);
                }
            }

            // 2. Apply Filters
            Stream<Ticket> stream = allTickets.stream();

            if (status != null && !status.isBlank()) {
                stream = stream.filter(t -> t.getStatus() != null && t.getStatus().equalsIgnoreCase(status));
            }

            if (search != null && !search.isBlank()) {
                String q = search.toLowerCase();
                stream = stream.filter(t ->
                        (t.getTicketNumber() != null && t.getTicketNumber().toLowerCase().contains(q)) ||
                        (t.getMuseumName() != null && t.getMuseumName().toLowerCase().contains(q))
                );
            }

            if ("upcoming".equalsIgnoreCase(period)) {
                stream = stream.filter(t -> {
                    java.time.LocalDate d = t.getBookedDate() != null ? t.getBookedDate() : (t.getCreatedAt() != null ? t.getCreatedAt().toLocalDate() : null);
                    return d != null && !d.isBefore(java.time.LocalDate.now());
                });
            } else if ("past".equalsIgnoreCase(period)) {
                stream = stream.filter(t -> {
                    java.time.LocalDate d = t.getBookedDate() != null ? t.getBookedDate() : (t.getCreatedAt() != null ? t.getCreatedAt().toLocalDate() : null);
                    return d != null && d.isBefore(java.time.LocalDate.now());
                });
            }

            List<Ticket> filteredTickets = stream.collect(Collectors.toList());

            // 3. Apply Sorting
            if ("upcoming".equalsIgnoreCase(sort)) {
                filteredTickets.sort(Comparator.comparing(t -> t.getBookedDate() != null ? t.getBookedDate() : java.time.LocalDate.MAX));
            } else if ("oldest".equalsIgnoreCase(sort)) {
                filteredTickets.sort(Comparator.comparing(t -> t.getCreatedAt() != null ? t.getCreatedAt() : java.time.LocalDateTime.MIN));
            } else {
                // Default: newest
                filteredTickets.sort(Comparator.comparing(t -> t.getCreatedAt() != null ? t.getCreatedAt() : java.time.LocalDateTime.MIN, Comparator.reverseOrder()));
            }

            List<Map<String, Object>> ticketDtos = filteredTickets.stream()
                    .map(this::toTicketDto)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(ApiResponse.success("Tickets retrieved", ticketDtos));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /* ── GET /api/visitor/tickets/{id} — get own ticket detail ── */
    @GetMapping("/{ticketId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTicketDetail(
            @RequestAttribute("userId") String userId,
            @PathVariable Long ticketId) {
        try {
            Long visitorId = Long.parseLong(userId);
            Ticket ticket = ticketRepository.findById(ticketId)
                    .orElseThrow(() -> new RuntimeException("Ticket not found"));

            enforceOwnership(ticket, visitorId);

            return ResponseEntity.ok(ApiResponse.success("Ticket found", toTicketDto(ticket)));
        } catch (RuntimeException e) {
            return ResponseEntity.status(e.getMessage().contains("not found") ? 404 : 403)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /* ── GET /api/visitor/tickets/cancellable — list tickets eligible for cancellation ── */
    @GetMapping("/cancellable")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCancellableTickets(
            @RequestAttribute("userId") String userId) {
        try {
            Long visitorId = Long.parseLong(userId);
            List<Ticket> tickets = ticketRepository.findCancellableByVisitorId(visitorId);

            List<Map<String, Object>> result = tickets.stream()
                    .map(t -> {
                        Map<String, Object> dto = toTicketDto(t);
                        Map<String, Object> refundInfo = refundService.calculateRefund(t);
                        dto.put("cancellation", refundInfo);
                        return dto;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(ApiResponse.success("Cancellable tickets", result));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /* ── POST /api/visitor/tickets/{id}/cancel — cancel with refund ── */
    @PostMapping("/{ticketId}/cancel")
    public ResponseEntity<ApiResponse<Map<String, Object>>> cancelTicket(
            @RequestAttribute("userId") String userId,
            @PathVariable Long ticketId) {
        try {
            Long visitorId = Long.parseLong(userId);
            Ticket ticket = ticketRepository.findById(ticketId)
                    .orElseThrow(() -> new RuntimeException("Ticket not found"));

            enforceOwnership(ticket, visitorId);

            Map<String, Object> result = refundService.processCancellation(ticket);
            return ResponseEntity.ok(ApiResponse.success("Ticket cancelled successfully", result));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /* ── POST /api/visitor/tickets/{id}/reschedule — reschedule to new slot ── */
    @PostMapping("/{ticketId}/reschedule")
    public ResponseEntity<ApiResponse<Map<String, Object>>> rescheduleTicket(
            @RequestAttribute("userId") String userId,
            @PathVariable Long ticketId,
            @Valid @RequestBody TicketRescheduleRequest request) {
        try {
            Long visitorId = Long.parseLong(userId);
            Ticket ticket = ticketRepository.findById(ticketId)
                    .orElseThrow(() -> new RuntimeException("Ticket not found"));

            enforceOwnership(ticket, visitorId);

            Map<String, Object> result = ticketService.rescheduleTicket(ticket, request);
            return ResponseEntity.ok(ApiResponse.success("Ticket rescheduled", result));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /* ── GET /api/visitor/tickets/by-token/{token} — public share view ── */
    @GetMapping("/by-token/{token}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getByPublicToken(@PathVariable String token) {
        try {
            Ticket ticket = ticketRepository.findByPublicToken(token)
                    .orElseThrow(() -> new RuntimeException("Ticket not found or link expired"));

            // Return limited info for shared view
            Map<String, Object> dto = new HashMap<>();
            dto.put("ticketNumber", ticket.getTicketNumber());
            dto.put("museumName", ticket.getMuseumName());
            dto.put("bookedDate", ticket.getBookedDate());
            dto.put("slotStart", ticket.getSlotStart());
            dto.put("slotEnd", ticket.getSlotEnd());
            dto.put("status", ticket.getEffectiveStatus());
            dto.put("adults", ticket.getAdults());
            dto.put("children", ticket.getChildren());
            dto.put("totalVisitors", ticket.getTotalVisitors());

            return ResponseEntity.ok(ApiResponse.success("Ticket found", dto));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage()));
        }
    }

    /* ── HELPERS ── */
    private void enforceOwnership(Ticket ticket, Long visitorId) {
        boolean isOwner = (ticket.getVisitor() != null && ticket.getVisitor().getId().equals(visitorId));

        if (!isOwner) {
            // Check by email as fallback for legacy tickets
            Visitor visitor = visitorRepository.findById(visitorId)
                    .orElseThrow(() -> new RuntimeException("Visitor not found"));
            if (ticket.getUserEmail() != null && ticket.getUserEmail().equalsIgnoreCase(visitor.getEmail())) {
                // Link the legacy ticket
                ticket.setVisitor(visitor);
                ticketRepository.save(ticket);
                return;
            }
            throw new RuntimeException("You do not have permission to access this ticket");
        }
    }

    private Map<String, Object> toTicketDto(Ticket t) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", t.getId());
        dto.put("ticketNumber", t.getTicketNumber());
        dto.put("museumId", t.getMuseumId());
        dto.put("museumName", t.getMuseumName());
        dto.put("status", t.getEffectiveStatus());
        dto.put("adults", t.getAdults());
        dto.put("children", t.getChildren());
        dto.put("totalVisitors", t.getTotalVisitors());
        dto.put("admittedVisitors", t.getAdmittedVisitors());
        dto.put("remainingVisitors", t.getRemainingVisitors());
        dto.put("totalPrice", t.getTotalPrice());
        dto.put("bookedDate", t.getBookedDate());
        dto.put("slotStart", t.getSlotStart());
        dto.put("slotEnd", t.getSlotEnd());
        dto.put("publicToken", t.getPublicToken());
        dto.put("paymentId", t.getPaymentId());
        dto.put("refundAmount", t.getRefundAmount());
        dto.put("refundStatus", t.getRefundStatus());
        dto.put("createdAt", t.getCreatedAt());
        dto.put("usedAt", t.getUsedAt());
        dto.put("userEmail", t.getUserEmail());

        // Museum image for ticket display
        if (t.getMuseum() != null) {
            dto.put("museumCoverImage", t.getMuseum().getCoverImageUrl());
            dto.put("museumDisplayImage", t.getMuseum().getDisplayImageUrl());
        }

        return dto;
    }
}
