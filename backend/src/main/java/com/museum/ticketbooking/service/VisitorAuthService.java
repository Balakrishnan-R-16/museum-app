package com.museum.ticketbooking.service;

import com.museum.ticketbooking.dto.GoogleAuthRequest;
import com.museum.ticketbooking.dto.VisitorLoginRequest;
import com.museum.ticketbooking.dto.VisitorRegisterRequest;
import com.museum.ticketbooking.dto.VisitorUpdateRequest;
import com.museum.ticketbooking.model.Visitor;
import com.museum.ticketbooking.repository.VisitorRepository;
import com.museum.ticketbooking.util.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
public class VisitorAuthService {

    private final VisitorRepository visitorRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final GoogleOAuthService googleOAuthService;

    public VisitorAuthService(VisitorRepository visitorRepository,
                              PasswordEncoder passwordEncoder,
                              JwtUtil jwtUtil,
                              GoogleOAuthService googleOAuthService) {
        this.visitorRepository = visitorRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.googleOAuthService = googleOAuthService;
    }

    /* ── Register with email/password ── */
    @Transactional
    public Map<String, Object> register(VisitorRegisterRequest request) {
        if (visitorRepository.existsByEmail(request.getEmail().trim().toLowerCase())) {
            throw new RuntimeException("An account with this email already exists. Please log in instead.");
        }

        Visitor visitor = new Visitor();
        visitor.setEmail(request.getEmail().trim().toLowerCase());
        visitor.setName(request.getName().trim());
        visitor.setDisplayName(request.getName().trim());
        visitor.setPassword(passwordEncoder.encode(request.getPassword()));
        visitor.setAuthProvider(Visitor.AuthProvider.LOCAL);

        Visitor saved = visitorRepository.save(visitor);
        return buildAuthResponse(saved);
    }

    /* ── Login with email/password ── */
    public Map<String, Object> login(VisitorLoginRequest request) {
        Visitor visitor = visitorRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (visitor.getAuthProvider() == Visitor.AuthProvider.GOOGLE && visitor.getPassword() == null) {
            throw new RuntimeException("This account uses Google Sign-In. Please use 'Continue with Google' to log in.");
        }

        if (visitor.getPassword() == null || !passwordEncoder.matches(request.getPassword(), visitor.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        return buildAuthResponse(visitor);
    }

    /* ── Google OAuth sign-in/sign-up ── */
    @Transactional
    public Map<String, Object> googleAuth(GoogleAuthRequest request) {
        GoogleOAuthService.GoogleUserInfo userInfo = googleOAuthService.verifyIdToken(request.getIdToken());

        // Try to find by Google subject first
        Visitor visitor = visitorRepository.findByGoogleSubject(userInfo.getSubject()).orElse(null);

        if (visitor == null) {
            // Try to find by email and link Google account
            visitor = visitorRepository.findByEmail(userInfo.getEmail().toLowerCase()).orElse(null);

            if (visitor != null) {
                // Link Google to existing account
                visitor.setGoogleSubject(userInfo.getSubject());
                visitor.setAuthProvider(Visitor.AuthProvider.GOOGLE);
                if (visitor.getAvatarUrl() == null && userInfo.getPictureUrl() != null) {
                    visitor.setAvatarUrl(userInfo.getPictureUrl());
                }
                if (visitor.getDisplayName() == null && userInfo.getName() != null) {
                    visitor.setDisplayName(userInfo.getName());
                }
                visitor = visitorRepository.save(visitor);
            } else {
                // Create new visitor from Google
                visitor = new Visitor();
                visitor.setEmail(userInfo.getEmail().toLowerCase());
                visitor.setName(userInfo.getName());
                visitor.setDisplayName(userInfo.getName());
                visitor.setGoogleSubject(userInfo.getSubject());
                visitor.setAvatarUrl(userInfo.getPictureUrl());
                visitor.setAuthProvider(Visitor.AuthProvider.GOOGLE);
                visitor = visitorRepository.save(visitor);
            }
        } else {
            // Update avatar/name if changed on Google
            if (userInfo.getPictureUrl() != null) {
                visitor.setAvatarUrl(userInfo.getPictureUrl());
            }
            if (userInfo.getName() != null && (visitor.getDisplayName() == null || visitor.getDisplayName().isBlank())) {
                visitor.setDisplayName(userInfo.getName());
            }
            visitor = visitorRepository.save(visitor);
        }

        return buildAuthResponse(visitor);
    }

    /* ── Get current visitor profile ── */
    public Map<String, Object> getProfile(Long visitorId) {
        Visitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new RuntimeException("Visitor not found"));

        Map<String, Object> profile = new HashMap<>();
        profile.put("id", visitor.getId());
        profile.put("email", visitor.getEmail());
        profile.put("name", visitor.getEffectiveDisplayName());
        profile.put("displayName", visitor.getDisplayName());
        profile.put("avatarUrl", visitor.getAvatarUrl());
        profile.put("authProvider", visitor.getAuthProvider().name());
        profile.put("createdAt", visitor.getCreatedAt());
        return profile;
    }

    /* ── Update visitor profile ── */
    @Transactional
    public Map<String, Object> updateProfile(Long visitorId, VisitorUpdateRequest request) {
        Visitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new RuntimeException("Visitor not found"));

        if (request.getDisplayName() != null) {
            visitor.setDisplayName(request.getDisplayName().trim());
        }

        if (request.getNewPassword() != null && !request.getNewPassword().isBlank()) {
            if (visitor.getAuthProvider() == Visitor.AuthProvider.GOOGLE && visitor.getPassword() == null) {
                // Google-only account setting up a password for the first time
                visitor.setPassword(passwordEncoder.encode(request.getNewPassword()));
            } else {
                // Must provide current password
                if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
                    throw new RuntimeException("Current password is required to change your password");
                }
                if (!passwordEncoder.matches(request.getCurrentPassword(), visitor.getPassword())) {
                    throw new RuntimeException("Current password is incorrect");
                }
                visitor.setPassword(passwordEncoder.encode(request.getNewPassword()));
            }
        }

        visitorRepository.save(visitor);
        return getProfile(visitorId);
    }

    /* ── Build JWT response ── */
    private Map<String, Object> buildAuthResponse(Visitor visitor) {
        String token = jwtUtil.generateToken(
                visitor.getId().toString(),
                visitor.getEmail(),
                "VISITOR"
        );

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("visitorId", visitor.getId());
        response.put("email", visitor.getEmail());
        response.put("name", visitor.getEffectiveDisplayName());
        response.put("displayName", visitor.getDisplayName());
        response.put("avatarUrl", visitor.getAvatarUrl());
        response.put("authProvider", visitor.getAuthProvider().name());
        return response;
    }
}
