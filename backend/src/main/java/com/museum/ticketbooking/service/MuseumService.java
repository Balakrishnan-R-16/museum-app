package com.museum.ticketbooking.service;

import com.museum.ticketbooking.dto.LoginRequest;
import com.museum.ticketbooking.dto.MuseumRegistrationDTO;
import com.museum.ticketbooking.model.Museum;
import com.museum.ticketbooking.repository.MuseumRepository;
import com.museum.ticketbooking.repository.TicketRepository;
import com.museum.ticketbooking.repository.ShowRepository;
import com.museum.ticketbooking.util.JwtUtil;
import com.museum.ticketbooking.dto.PublicMuseumListDTO;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MuseumService {

    private final MuseumRepository museumRepository;
    private final TicketRepository ticketRepository;
    private final ShowRepository showRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final SseService sseService;
    private final GoogleOAuthService googleOAuthService;

    public MuseumService(MuseumRepository museumRepository, TicketRepository ticketRepository,
                         ShowRepository showRepository, PasswordEncoder passwordEncoder,
                         JwtUtil jwtUtil, SseService sseService, GoogleOAuthService googleOAuthService) {
        this.museumRepository = museumRepository;
        this.ticketRepository = ticketRepository;
        this.showRepository   = showRepository;
        this.passwordEncoder  = passwordEncoder;
        this.jwtUtil          = jwtUtil;
        this.sseService       = sseService;
        this.googleOAuthService = googleOAuthService;
    }

    /* ── REGISTER ── */
    @Transactional
    public Museum registerMuseum(MuseumRegistrationDTO request) {
        if (museumRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }
        
        if (request.getIdToken() != null && !request.getIdToken().isEmpty()) {
            GoogleOAuthService.GoogleUserInfo userInfo = googleOAuthService.verifyIdToken(request.getIdToken());
            if (!userInfo.getEmail().equalsIgnoreCase(request.getEmail())) {
                throw new RuntimeException("Google token email does not match requested email");
            }
        } else if (request.getPassword() == null || request.getPassword().isEmpty()) {
            throw new RuntimeException("Password is required if not using Google Sign-In");
        }

        Museum museum = new Museum();
        museum.setMuseumName(request.getMuseumName());
        museum.setLocation(request.getLocation());
        museum.setEmail(request.getEmail());
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            museum.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        museum.setSeatLimit(request.getSeatCapacity());
        museum.setAdultPrice(request.getAdultTicketPrice());
        museum.setChildPrice(request.getChildTicketPrice());
        museum.setBookingStatus(true);
        museum.setStaffPin(generateRandomStaffPin());

        Museum saved = museumRepository.save(museum);

        // Map and emit SSE event
        PublicMuseumListDTO dto = new PublicMuseumListDTO();
        dto.setId(saved.getId());
        dto.setMuseumName(saved.getMuseumName());
        dto.setLocation(saved.getLocation());
        dto.setAdultPrice(saved.getAdultPrice());
        dto.setChildPrice(saved.getChildPrice());
        dto.setBookingStatus(saved.getBookingStatus());
        dto.setAverageRating(0.0);
        dto.setReviewCount(0L);
        dto.setAmenities(List.of());
        
        sseService.emitGlobalEvent("museum_registered", dto);

        return saved;
    }

    /* ── LOGIN ── */
    public Map<String, Object> authenticate(LoginRequest request) {
        Museum museum = museumRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (museum.getPassword() == null || museum.getPassword().isEmpty()) {
            throw new RuntimeException("This account uses Google Sign-In. Please use 'Continue with Google' to log in.");
        }

        if (!passwordEncoder.matches(request.getPassword(), museum.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        return getLoginData(museum);
    }
    
    /* ── GOOGLE LOGIN ── */
    public Map<String, Object> googleLogin(String idToken) {
        GoogleOAuthService.GoogleUserInfo userInfo = googleOAuthService.verifyIdToken(idToken);
        Museum museum = museumRepository.findByEmail(userInfo.getEmail())
            .orElseThrow(() -> new RuntimeException("No museum registered with this Google email. Please register first."));
            
        return getLoginData(museum);
    }
    
    private Map<String, Object> getLoginData(Museum museum) {

        String token = jwtUtil.generateToken(museum.getId().toString(), museum.getEmail(), "MUSEUM");

        Map<String, Object> resp = new HashMap<>();
        resp.put("token",      token);
        resp.put("museumId",   museum.getId());
        resp.put("museumName", museum.getMuseumName());
        resp.put("email",      museum.getEmail());
        return resp;
    }

    /* ── GET BY ID ── */
    public Museum getMuseumById(Long id) {
        return museumRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Museum not found"));
    }

    /* ── GET ALL (only active / registered museums) ── */
    public List<Museum> getAllMuseums() {
        return museumRepository.findAllActiveMuseums();
    }

    /* ── UPDATE MUSEUM (prices, timings, seats) ── */
    @Transactional
    public Museum updateMuseum(Long id, Museum patch) {
        Museum museum = getMuseumById(id);

        if (patch.getMuseumName()    != null)  museum.setMuseumName(patch.getMuseumName());
        if (patch.getLocation()      != null)  museum.setLocation(patch.getLocation());
        if (patch.getAdultPrice()    != null)  museum.setAdultPrice(patch.getAdultPrice());
        if (patch.getChildPrice()    != null)  museum.setChildPrice(patch.getChildPrice());
        if (patch.getSeatLimit()     != null)  museum.setSeatLimit(patch.getSeatLimit());
        if (patch.getBookingStatus() != null)  museum.setBookingStatus(patch.getBookingStatus());
        if (patch.getOpeningTime()   != null)  museum.setOpeningTime(patch.getOpeningTime());
        if (patch.getClosingTime()   != null)  museum.setClosingTime(patch.getClosingTime());

        return museumRepository.save(museum);
    }

    /* ── TOGGLE BOOKING STATUS ── */
    @Transactional
    public Museum updateBookingStatus(Long id, boolean status) {
        Museum museum = getMuseumById(id);
        museum.setBookingStatus(status);
        return museumRepository.save(museum);
    }

    /* ── REGENERATE STAFF PIN ── */
    @Transactional
    public String regenerateStaffPin(Long id) {
        Museum museum = getMuseumById(id);
        String newPin = generateRandomStaffPin();
        museum.setStaffPin(newPin);
        museumRepository.save(museum);
        return newPin;
    }

    /* ── STATISTICS ── */
    public Map<String, Object> getMuseumStatistics(Long id) {
        Museum museum = getMuseumById(id);

        Long   todayTickets  = ticketRepository.countTodayTickets(id);
        Double todayRevenue  = ticketRepository.getTodayRevenue(id);
        int    activeCount   = ticketRepository.findByMuseumIdAndStatus(id, "ACTIVE").size();
        Long   totalShows    = showRepository.countByMuseumId(id);

        Map<String, Object> stats = new HashMap<>();
        stats.put("museumId",            id);
        stats.put("museumName",          museum.getMuseumName());
        stats.put("todayTicketsCount",   todayTickets);
        stats.put("todayRevenue",        todayRevenue != null ? todayRevenue : 0.0);
        stats.put("activeBookingsCount", activeCount);
        stats.put("totalShowsCount",     totalShows);
        stats.put("seatLimit",           museum.getSeatLimit());
        stats.put("bookingStatus",       museum.getBookingStatus());
        return stats;
    }

    public List<Museum> getNearbyMuseums(double lat, double lon, double radius) {
        List<Museum> museums = museumRepository.findNearbyMuseums(lat, lon, radius);
        for (Museum m : museums) {
            if (m.getLatitude() != null && m.getLongitude() != null) {
                m.setDistance(calculateDistance(lat, lon, m.getLatitude(), m.getLongitude()));
            }
        }
        return museums;
    }

    /* ── HELPER ── */
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371; // Radius of the earth in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    private String generateRandomStaffPin() {
        return String.format("%04d", 1000 + (int) (Math.random() * 9000));
    }
}
