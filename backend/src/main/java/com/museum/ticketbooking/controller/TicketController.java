package com.museum.ticketbooking.controller;

import com.museum.ticketbooking.dto.ApiResponse;
import com.museum.ticketbooking.dto.SendOtpRequest;
import com.museum.ticketbooking.dto.TicketBookingRequest;
import com.museum.ticketbooking.dto.VerificationRequest;
import com.museum.ticketbooking.model.Ticket;
import com.museum.ticketbooking.service.TicketService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tickets")
@CrossOrigin(origins = "http://localhost:5173")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    /* ──────────────────────────────────────────────────────
       POST /api/tickets/book
       Called by chatbot after collecting email + phone.
       No OTP required.
    ────────────────────────────────────────────────────── */
    @PostMapping("/book")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bookTicket(
            @Valid @RequestBody TicketBookingRequest request) {
        try {
            Map<String, Object> result = ticketService.createTicket(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Ticket created successfully", result));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /* ──────────────────────────────────────────────────────
       POST /api/tickets/verify
       Staff enters the 4-digit museum PIN to mark ticket USED.
    ────────────────────────────────────────────────────── */
    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyTicket(
            @Valid @RequestBody VerificationRequest request) {
        try {
            Map<String, Object> data = ticketService.verifyTicketWithEntry(request);
            return ResponseEntity.ok(ApiResponse.success(
                    (String) data.getOrDefault("message", "Ticket verified successfully"),
                    data));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /* ── GET by user email ── */
    @GetMapping("/user/{email}")
    public ResponseEntity<ApiResponse<List<Ticket>>> getUserTickets(@PathVariable String email) {
        try {
            List<Ticket> tickets = ticketService.getUserTickets(email);
            return ResponseEntity.ok(ApiResponse.success("Tickets retrieved", tickets));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /* ── GET all tickets for a museum ── */
    @GetMapping("/museum/{museumId}")
    public ResponseEntity<ApiResponse<List<Ticket>>> getMuseumTickets(@PathVariable Long museumId) {
        try {
            List<Ticket> tickets = ticketService.getMuseumTickets(museumId);
            return ResponseEntity.ok(ApiResponse.success("Tickets retrieved", tickets));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /* ── GET tickets by phone number ── */
    @GetMapping("/museum/{museumId}/phone/{phone}")
    public ResponseEntity<ApiResponse<List<Ticket>>> getTicketsByPhone(
            @PathVariable Long museumId, @PathVariable String phone) {
        try {
            List<Ticket> tickets = ticketService.getTicketsByPhone(museumId, phone);
            return ResponseEntity.ok(ApiResponse.success("Tickets retrieved", tickets));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /* ── GET by ticket ID ── */
    @GetMapping("/{ticketId}")
    public ResponseEntity<ApiResponse<Ticket>> getTicketById(@PathVariable Long ticketId) {
        try {
            Ticket ticket = ticketService.getTicketById(ticketId);
            return ResponseEntity.ok(ApiResponse.success("Ticket found", ticket));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage()));
        }
    }

    /* ── GET by ticket number ── */
    @GetMapping("/number/{ticketNumber}")
    public ResponseEntity<ApiResponse<Ticket>> getTicketByNumber(@PathVariable String ticketNumber) {
        try {
            Ticket ticket = ticketService.getTicketByNumber(ticketNumber);
            return ResponseEntity.ok(ApiResponse.success("Ticket found", ticket));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage()));
        }
    }

    /* ── POST cancel ── */
    @PostMapping("/{ticketId}/cancel")
    public ResponseEntity<ApiResponse<Ticket>> cancelTicket(@PathVariable Long ticketId) {
        try {
            Ticket ticket = ticketService.cancelTicket(ticketId);
            return ResponseEntity.ok(ApiResponse.success("Ticket cancelled", ticket));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /* ── GET today's tickets ── */
    @GetMapping("/museum/{museumId}/today")
    public ResponseEntity<ApiResponse<List<Ticket>>> getTodayTickets(@PathVariable Long museumId) {
        try {
            List<Ticket> tickets = ticketService.getTodayTickets(museumId);
            return ResponseEntity.ok(ApiResponse.success("Today's tickets", tickets));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
