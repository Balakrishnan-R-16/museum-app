package com.museum.ticketbooking.controller;

import com.museum.ticketbooking.dto.*;
import com.museum.ticketbooking.service.VisitorAuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/visitor/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class VisitorAuthController {

    private final VisitorAuthService visitorAuthService;

    public VisitorAuthController(VisitorAuthService visitorAuthService) {
        this.visitorAuthService = visitorAuthService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Map<String, Object>>> register(
            @Valid @RequestBody VisitorRegisterRequest request) {
        try {
            Map<String, Object> result = visitorAuthService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Registration successful", result));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(
            @Valid @RequestBody VisitorLoginRequest request) {
        try {
            Map<String, Object> result = visitorAuthService.login(request);
            return ResponseEntity.ok(ApiResponse.success("Login successful", result));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<Map<String, Object>>> googleAuth(
            @Valid @RequestBody GoogleAuthRequest request) {
        try {
            Map<String, Object> result = visitorAuthService.googleAuth(request);
            return ResponseEntity.ok(ApiResponse.success("Google authentication successful", result));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProfile(
            @RequestAttribute("userId") String userId) {
        try {
            Map<String, Object> profile = visitorAuthService.getProfile(Long.parseLong(userId));
            return ResponseEntity.ok(ApiResponse.success("Profile retrieved", profile));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateProfile(
            @RequestAttribute("userId") String userId,
            @Valid @RequestBody VisitorUpdateRequest request) {
        try {
            Map<String, Object> result = visitorAuthService.updateProfile(Long.parseLong(userId), request);
            return ResponseEntity.ok(ApiResponse.success("Profile updated", result));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
