package com.museum.ticketbooking.service;

import com.museum.ticketbooking.dto.TicketBookingRequest;
import com.museum.ticketbooking.dto.TicketRescheduleRequest;
import com.museum.ticketbooking.dto.VerificationRequest;
import com.museum.ticketbooking.model.Museum;
import com.museum.ticketbooking.model.Ticket;
import com.museum.ticketbooking.model.TicketEntryAudit;
import com.museum.ticketbooking.model.Visitor;
import com.museum.ticketbooking.repository.MuseumRepository;
import com.museum.ticketbooking.repository.TicketEntryAuditRepository;
import com.museum.ticketbooking.repository.TicketRepository;
import com.museum.ticketbooking.repository.VisitorRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TicketService {

    private final TicketRepository ticketRepository;
    private final MuseumRepository museumRepository;
    private final TicketEntryAuditRepository entryAuditRepository;
    private final VisitorRepository visitorRepository;

    public TicketService(TicketRepository ticketRepository,
                         MuseumRepository museumRepository,
                         TicketEntryAuditRepository entryAuditRepository,
                         VisitorRepository visitorRepository) {
        this.ticketRepository = ticketRepository;
        this.museumRepository = museumRepository;
        this.entryAuditRepository = entryAuditRepository;
        this.visitorRepository = visitorRepository;
    }

    /* ── CREATE TICKET ── */
    @Transactional
    public Map<String, Object> createTicket(TicketBookingRequest request) {
        Museum museum = museumRepository.findById(request.getMuseumId())
                .orElseThrow(() -> new RuntimeException("Museum not found"));

        if (!Boolean.TRUE.equals(museum.getBookingStatus())) {
            throw new RuntimeException("Bookings are currently closed for this museum");
        }

        if (museum.getSeatLimit() != null && museum.getSeatLimit() <= 0) {
            throw new RuntimeException("No seats available for today");
        }

        int adults   = request.getAdults()   == null ? 0 : request.getAdults();
        int children = request.getChildren() == null ? 0 : request.getChildren();

        if (adults + children <= 0) {
            throw new RuntimeException("At least one adult or child must be selected");
        }

        double adultPrice = museum.getAdultPrice() == null ? 0 : museum.getAdultPrice();
        double childPrice = museum.getChildPrice() == null ? 0 : museum.getChildPrice();
        double total      = (adults * adultPrice) + (children * childPrice);

        Ticket ticket = new Ticket();
        ticket.setMuseum(museum);
        ticket.setUserEmail(request.getEmail().trim().toLowerCase());
        // Phone is now optional
        ticket.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        ticket.setAdults(adults);
        ticket.setChildren(children);
        ticket.setTotalVisitors(adults + children);
        ticket.setAdmittedVisitors(0);
        ticket.setTotalPrice(total);
        ticket.setStatus(total > 0 ? "PENDING" : "ACTIVE");
        ticket.setBookedDate(request.getBookedDate() != null ? request.getBookedDate() : LocalDate.now());
        ticket.setSlotStart(request.getSlotStart());
        ticket.setSlotEnd(request.getSlotEnd());

        // Link to visitor if visitorId is provided
        if (request.getVisitorId() != null) {
            Visitor visitor = visitorRepository.findById(request.getVisitorId()).orElse(null);
            if (visitor != null) {
                ticket.setVisitor(visitor);
            }
        }

        Ticket saved = ticketRepository.save(ticket);

        Map<String, Object> result = new HashMap<>();
        result.put("id",           saved.getId());
        result.put("ticketId",     saved.getId());
        result.put("ticketNumber", saved.getTicketNumber());
        result.put("totalPrice",   saved.getTotalPrice());
        result.put("museumName",   museum.getMuseumName());
        result.put("status",       saved.getStatus());
        result.put("adults",       adults);
        result.put("children",     children);
        result.put("publicToken",  saved.getPublicToken());
        result.put("bookedDate",   saved.getBookedDate());
        result.put("slotStart",    saved.getSlotStart());
        result.put("slotEnd",      saved.getSlotEnd());
        return result;
    }

    /* ── SAVE PAYMENT ORDER ID ── */
    @Transactional
    public void savePaymentOrder(Long ticketId, String orderId) {
        Ticket ticket = getTicketById(ticketId);
        if ("USED".equalsIgnoreCase(ticket.getStatus()) || "CANCELLED".equalsIgnoreCase(ticket.getStatus())) {
            throw new RuntimeException("Cannot create payment order for used or cancelled ticket");
        }
        if (ticket.getPaymentId() != null && !ticket.getPaymentId().isBlank()) {
            throw new RuntimeException("Ticket is already paid");
        }
        ticket.setOrderId(orderId);
        ticketRepository.save(ticket);
    }

    /* ── ACTIVATE TICKET AFTER PAYMENT ── */
    @Transactional
    public void activateTicketPayment(Long ticketId, String paymentId, String orderId) {
        Ticket ticket = getTicketById(ticketId);
        if ("ACTIVE".equalsIgnoreCase(ticket.getStatus()))    return;
        if ("USED".equalsIgnoreCase(ticket.getStatus()))       throw new RuntimeException("Used ticket cannot be activated again");
        if ("CANCELLED".equalsIgnoreCase(ticket.getStatus())) throw new RuntimeException("Cancelled ticket cannot be activated");

        ticket.setPaymentId(paymentId);
        ticket.setOrderId(orderId);
        ticket.setStatus("ACTIVE");
        ticketRepository.save(ticket);
    }

    /* ── VERIFY TICKET WITH PARTIAL GROUP ENTRY ── */
    @Transactional
    public Map<String, Object> verifyTicketWithEntry(VerificationRequest request) {
        Ticket ticket = ticketRepository.findById(request.getTicketId())
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        if (ticket.getMuseum() == null || !ticket.getMuseum().getId().equals(request.getMuseumId())) {
            throw new RuntimeException("Ticket does not belong to this museum");
        }

        String effectiveStatus = ticket.getEffectiveStatus();

        // Check ticket is valid for entry
        if (!"ACTIVE".equalsIgnoreCase(effectiveStatus)
                && !"PARTIALLY_USED".equalsIgnoreCase(effectiveStatus)) {
            throw new RuntimeException("Ticket is not valid for entry. Status: " + effectiveStatus);
        }

        // Check ticket hasn't expired
        if (ticket.isExpired()) {
            ticket.setStatus("EXPIRED");
            ticketRepository.save(ticket);
            throw new RuntimeException("Ticket has expired. The booked date/time has passed.");
        }

        // Validate staff PIN
        String storedPin    = ticket.getMuseum().getStaffPin();
        String submittedPin = request.getStaffPin();

        if (storedPin == null || submittedPin == null || !storedPin.equals(submittedPin.trim())) {
            throw new RuntimeException("Invalid 4-digit museum code. Please ask staff for the correct code.");
        }

        // Determine entry count
        int entryCount = request.getEntryCount() != null ? request.getEntryCount() : ticket.getRemainingVisitors();

        if (entryCount <= 0) {
            throw new RuntimeException("Entry count must be at least 1");
        }

        int remaining = ticket.getRemainingVisitors();
        if (entryCount > remaining) {
            throw new RuntimeException("Cannot admit " + entryCount + " visitors. Only " + remaining + " remaining.");
        }

        // Atomic update with optimistic locking to prevent race conditions
        int currentAdmitted = ticket.getAdmittedVisitors() != null ? ticket.getAdmittedVisitors() : 0;
        int updated = ticketRepository.atomicAdmitVisitors(ticket.getId(), entryCount, currentAdmitted);

        if (updated == 0) {
            throw new RuntimeException("Concurrent entry detected. Please try again.");
        }

        // Record audit entry
        TicketEntryAudit audit = new TicketEntryAudit();
        audit.setTicketId(ticket.getId());
        audit.setStaffUser(request.getMuseumId().toString());
        audit.setEntryCount(entryCount);
        audit.setPriorAdmitted(currentAdmitted);
        audit.setResultingAdmitted(currentAdmitted + entryCount);
        entryAuditRepository.save(audit);

        // Reload ticket to get updated state
        ticket = ticketRepository.findById(ticket.getId()).orElseThrow();

        Map<String, Object> result = new HashMap<>();
        result.put("verified", true);
        result.put("ticketId", ticket.getId());
        result.put("ticketNumber", ticket.getTicketNumber());
        result.put("entryCount", entryCount);
        result.put("totalVisitors", ticket.getTotalVisitors());
        result.put("admittedVisitors", ticket.getAdmittedVisitors());
        result.put("remainingVisitors", ticket.getRemainingVisitors());
        result.put("status", ticket.getStatus());
        result.put("message", entryCount + " visitor(s) admitted. " +
                (ticket.getRemainingVisitors() > 0 ?
                        ticket.getRemainingVisitors() + " remaining." :
                        "All visitors admitted."));

        return result;
    }

    /* ── Legacy verify (backward compatibility) ── */
    @Transactional
    public boolean verifyTicket(VerificationRequest request) {
        Map<String, Object> result = verifyTicketWithEntry(request);
        return Boolean.TRUE.equals(result.get("verified"));
    }

    /* ── RESCHEDULE TICKET ── */
    @Transactional
    public Map<String, Object> rescheduleTicket(Ticket ticket, TicketRescheduleRequest request) {
        String effectiveStatus = ticket.getEffectiveStatus();

        if (!"ACTIVE".equalsIgnoreCase(effectiveStatus)) {
            throw new RuntimeException("Only active tickets can be rescheduled. Current status: " + effectiveStatus);
        }

        if (ticket.isExpired()) {
            throw new RuntimeException("Expired tickets cannot be rescheduled");
        }

        if (request.getNewDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("Cannot reschedule to a past date");
        }

        // Check capacity for new date
        int bookedOnNewDate = ticketRepository.countBookedVisitorsForDate(
                ticket.getMuseumId(),
                request.getNewDate()
        );

        Museum museum = ticket.getMuseum();
        int capacity = museum.getSeatLimit() != null ? museum.getSeatLimit() : 100;

        if (bookedOnNewDate + ticket.getTotalVisitors() > capacity) {
            throw new RuntimeException("Not enough capacity on the selected date. " +
                    (capacity - bookedOnNewDate) + " spots available.");
        }

        // Update ticket
        ticket.setBookedDate(request.getNewDate());
        ticket.setSlotStart(request.getNewSlotStart());
        ticket.setSlotEnd(request.getNewSlotEnd());
        ticket.setStatus("ACTIVE"); // Keep active after reschedule
        ticketRepository.save(ticket);

        Map<String, Object> result = new HashMap<>();
        result.put("ticketId", ticket.getId());
        result.put("ticketNumber", ticket.getTicketNumber());
        result.put("newDate", ticket.getBookedDate());
        result.put("newSlotStart", ticket.getSlotStart());
        result.put("newSlotEnd", ticket.getSlotEnd());
        result.put("status", "ACTIVE");
        result.put("message", "Ticket rescheduled successfully");
        return result;
    }

    /* ── SCHEDULED: Mark expired tickets ── */
    @Scheduled(fixedRate = 300000) // Every 5 minutes
    @Transactional
    public void markExpiredTickets() {
        int count = ticketRepository.markExpiredTickets(LocalDate.now());
        if (count > 0) {
            System.out.println("Marked " + count + " ticket(s) as EXPIRED");
        }
    }

    /* ── HELPERS ── */
    public Ticket getTicketByOrderId(String orderId) {
        return ticketRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Ticket not found for order ID"));
    }

    public List<Ticket> getUserTickets(String email) {
        return ticketRepository.findByUserEmailOrderByCreatedAtDesc(email.trim().toLowerCase());
    }

    public List<Ticket> getMuseumTickets(Long museumId) {
        return ticketRepository.findByMuseum_IdOrderByCreatedAtDesc(museumId);
    }

    public List<Ticket> getTicketsByPhone(Long museumId, String phone) {
        return ticketRepository.findByMuseum_IdAndPhoneOrderByCreatedAtDesc(museumId, phone.trim());
    }

    public Ticket getTicketById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
    }

    public Ticket getTicketByNumber(String ticketNumber) {
        return ticketRepository.findByTicketNumber(ticketNumber.trim())
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
    }

    @Transactional
    public Ticket cancelTicket(Long id) {
        Ticket ticket = getTicketById(id);
        if (!"ACTIVE".equalsIgnoreCase(ticket.getStatus()) && !"PENDING".equalsIgnoreCase(ticket.getStatus())) {
            throw new RuntimeException("Cannot cancel ticket with status: " + ticket.getStatus());
        }
        ticket.setStatus("CANCELLED");
        return ticketRepository.save(ticket);
    }

    public List<Ticket> getTodayTickets(Long museumId) {
        return ticketRepository.findTodayTicketsByMuseumId(museumId, LocalDate.now());
    }

    @Transactional
    public void updateTicketPayment(Long ticketId, String paymentId, String orderId) {
        Ticket ticket = getTicketById(ticketId);
        ticket.setPaymentId(paymentId);
        ticket.setOrderId(orderId);
        ticket.setStatus("ACTIVE");
        ticketRepository.save(ticket);
    }
}
