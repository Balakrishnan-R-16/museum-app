package com.museum.ticketbooking.controller;

import com.museum.ticketbooking.dto.ApiResponse;
import com.museum.ticketbooking.dto.LoginRequest;
import com.museum.ticketbooking.dto.MuseumRegistrationDTO;
import com.museum.ticketbooking.model.Museum;
import com.museum.ticketbooking.service.MuseumService;
import jakarta.validation.Valid;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/museums")
@CrossOrigin(origins = "http://localhost:5173")
public class MuseumController {
    
    private final MuseumService museumService;
    
    public MuseumController(MuseumService museumService) {
        this.museumService = museumService;
    }
    
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Map<String, Object>>> registerMuseum(
            @Valid @RequestBody MuseumRegistrationDTO request) {
        try {
            Museum museum = museumService.registerMuseum(request);
            
            Map<String, Object> data = new HashMap<>();
            data.put("museumId", museum.getId());
            data.put("museumName", museum.getMuseumName());

            
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Museum registered successfully", data));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
    
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(@Valid @RequestBody LoginRequest request) {
        try {
            Map<String, Object> data = museumService.authenticate(request);
            return ResponseEntity.ok(ApiResponse.success("Login successful", data));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
    
    @PostMapping("/google")
    public ResponseEntity<ApiResponse<Map<String, Object>>> googleLogin(@RequestBody Map<String, String> request) {
        try {
            String token = request.get("credential");
            Map<String, Object> data = museumService.googleLogin(token);
            return ResponseEntity.ok(ApiResponse.success("Login successful", data));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Museum>> getMuseumById(@PathVariable Long id) {
        try {
            Museum museum = museumService.getMuseumById(id);
            museum.setPassword(null);
            return ResponseEntity.ok(ApiResponse.success("Museum found", museum));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
    
    @GetMapping
    public ResponseEntity<ApiResponse<List<Museum>>> getAllMuseums() {
        try {
            List<Museum> museums = museumService.getAllMuseums();
            museums.forEach(m -> m.setPassword(null));
            return ResponseEntity.ok(ApiResponse.success("Museums retrieved successfully", museums));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to retrieve museums"));
        }
    }

    @GetMapping("/nearby")
    public ResponseEntity<ApiResponse<List<Museum>>> getNearbyMuseums(
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(defaultValue = "50") double radius) {
        try {
            List<Museum> museums = museumService.getNearbyMuseums(lat, lon, radius);
            museums.forEach(m -> m.setPassword(null));
            return ResponseEntity.ok(ApiResponse.success("Nearby museums retrieved", museums));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Museum>> updateMuseum(
            @PathVariable Long id, 
            @RequestBody Museum museum) {
        try {
            Museum updated = museumService.updateMuseum(id, museum);
            updated.setPassword(null);
            return ResponseEntity.ok(ApiResponse.success("Museum updated successfully", updated));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
    
    @PatchMapping("/{id}/booking-status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateBookingStatus(
            @PathVariable Long id,
            @RequestParam boolean status) {
        try {
            Museum museum = museumService.updateBookingStatus(id, status);
            Map<String, Object> data = new HashMap<>();
            data.put("bookingStatus", museum.getBookingStatus());
            return ResponseEntity.ok(ApiResponse.success("Booking status updated", data));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
    

    @PostMapping("/{id}/regenerate-pin")
    public ResponseEntity<ApiResponse<Map<String, Object>>> regenerateStaffPin(@PathVariable Long id) {
        try {
            String newPin = museumService.regenerateStaffPin(id);
            Map<String, Object> data = new HashMap<>();
            data.put("staffPin", newPin);
            return ResponseEntity.ok(ApiResponse.success("Staff PIN regenerated successfully", data));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
    
    @GetMapping("/{id}/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMuseumStats(@PathVariable Long id) {
        try {
            Map<String, Object> stats = museumService.getMuseumStatistics(id);
            return ResponseEntity.ok(ApiResponse.success("Statistics retrieved", stats));
        } catch (RuntimeException e) {
            if (e.getMessage().contains("Museum not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Museum not found"));
            }
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
    

}
