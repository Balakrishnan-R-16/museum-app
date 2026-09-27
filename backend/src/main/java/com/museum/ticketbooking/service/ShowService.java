package com.museum.ticketbooking.service;

import com.museum.ticketbooking.dto.ShowBookingRequest;
import com.museum.ticketbooking.dto.ShowCreationDTO;
import com.museum.ticketbooking.model.Museum;
import com.museum.ticketbooking.model.Show;
import com.museum.ticketbooking.model.ShowTicket;
import com.museum.ticketbooking.repository.MuseumRepository;
import com.museum.ticketbooking.repository.ShowRepository;
import com.museum.ticketbooking.repository.ShowTicketRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ShowService {
    
    private final ShowRepository showRepository;
    private final ShowTicketRepository showTicketRepository;
    private final MuseumRepository museumRepository;
    
    public ShowService(ShowRepository showRepository, ShowTicketRepository showTicketRepository, MuseumRepository museumRepository) {
        this.showRepository = showRepository;
        this.showTicketRepository = showTicketRepository;
        this.museumRepository = museumRepository;
    }
    
    @Transactional
    public Show createShow(Long museumId, ShowCreationDTO showDTO) {
        Museum museum = museumRepository.findById(museumId)
            .orElseThrow(() -> new RuntimeException("Museum not found"));
        
        Show show = new Show();
        show.setShowName(showDTO.getShowName());
        show.setShowTime(showDTO.getShowTime());
        show.setPrice(showDTO.getPrice());
        show.setSeatLimit(showDTO.getSeatLimit());
        show.setDescription(showDTO.getDescription());
        show.setMuseum(museum);
        show.setAvailableSeats(showDTO.getSeatLimit());
        show.setStatus("ACTIVE");
        
        return showRepository.save(show);
    }
    
    public List<Show> getMuseumShows(Long museumId) {
        return showRepository.findByMuseum_Id(museumId);
    }
    
    public List<Show> getActiveShows(Long museumId) {
        return showRepository.findByMuseum_IdAndStatus(museumId, "ACTIVE");
    }
    
    public List<Show> getUpcomingShows(Long museumId) {
        return showRepository.findUpcomingShows(museumId, LocalDateTime.now());
    }
    
    @Transactional
    public Map<String, Object> bookShowTicket(ShowBookingRequest request) {
        Show show = showRepository.findById(request.getShowId())
            .orElseThrow(() -> new RuntimeException("Show not found"));
        
        if (!"ACTIVE".equals(show.getStatus())) {
            throw new RuntimeException("Show is not available");
        }
        
        if (show.getAvailableSeats() < request.getQuantity()) {
            throw new RuntimeException("Not enough seats available. Available: " + show.getAvailableSeats());
        }
        
        // Calculate total price
        double totalPrice = show.getPrice() * request.getQuantity();
        
        // Create show ticket
        ShowTicket ticket = new ShowTicket();
        ticket.setShow(show);
        ticket.setMuseum(show.getMuseum());
        ticket.setUserEmail(request.getUserEmail());
        ticket.setQuantity(request.getQuantity());
        ticket.setTotalPrice(totalPrice);
        ticket.setStatus("ACTIVE");
        
        ShowTicket savedTicket = showTicketRepository.save(ticket);
        
        // Update available seats
        show.setAvailableSeats(show.getAvailableSeats() - request.getQuantity());
        showRepository.save(show);
        
        Map<String, Object> result = new HashMap<>();
        result.put("ticketId", savedTicket.getId());
        result.put("ticketNumber", savedTicket.getTicketNumber());
        result.put("totalPrice", totalPrice);
        result.put("showName", show.getShowName());
        result.put("quantity", request.getQuantity());
        
        return result;
    }
    
    @Transactional
    public Show updateShow(Long showId, Show updatedShow) {
        Show show = showRepository.findById(showId)
            .orElseThrow(() -> new RuntimeException("Show not found"));
        
        if (updatedShow.getShowName() != null) {
            show.setShowName(updatedShow.getShowName());
        }
        if (updatedShow.getShowTime() != null) {
            show.setShowTime(updatedShow.getShowTime());
        }
        if (updatedShow.getPrice() != null) {
            show.setPrice(updatedShow.getPrice());
        }
        if (updatedShow.getSeatLimit() != null) {
            show.setSeatLimit(updatedShow.getSeatLimit());
        }
        if (updatedShow.getDescription() != null) {
            show.setDescription(updatedShow.getDescription());
        }
        if (updatedShow.getStatus() != null) {
            show.setStatus(updatedShow.getStatus());
        }
        
        return showRepository.save(show);
    }
    
    @Transactional
    public void deleteShow(Long showId) {
        Show show = showRepository.findById(showId)
            .orElseThrow(() -> new RuntimeException("Show not found"));
        show.setStatus("CANCELLED");
        showRepository.save(show);
    }
    
    public Show getShowById(Long showId) {
        return showRepository.findById(showId)
            .orElseThrow(() -> new RuntimeException("Show not found"));
    }
    
    public List<ShowTicket> getUserShowTickets(String email) {
        return showTicketRepository.findByUserEmail(email);
    }
    
    public List<ShowTicket> getShowTickets(Long showId) {
        return showTicketRepository.findByShowId(showId);
    }
    
    @Transactional
    public boolean verifyShowTicket(Long ticketId, String verificationCode) {
        ShowTicket ticket = showTicketRepository.findById(ticketId)
            .orElseThrow(() -> new RuntimeException("Show ticket not found"));
        
        Museum museum = ticket.getMuseum();
        
        if (!museum.getVerificationCode().equals(verificationCode)) {
            throw new RuntimeException("Invalid verification code");
        }
        
        if (!"ACTIVE".equals(ticket.getStatus())) {
            throw new RuntimeException("Ticket is not active");
        }
        
        ticket.setStatus("USED");
        ticket.setUsedAt(LocalDateTime.now());
        showTicketRepository.save(ticket);
        
        return true;
    }
    
    @Transactional
    public void updateShowTicketPayment(Long ticketId, String paymentId, String orderId) {
        ShowTicket ticket = showTicketRepository.findById(ticketId)
            .orElseThrow(() -> new RuntimeException("Show ticket not found"));
        
        ticket.setPaymentId(paymentId);
        ticket.setOrderId(orderId);
        ticket.setStatus("ACTIVE");
        showTicketRepository.save(ticket);
    }
}
