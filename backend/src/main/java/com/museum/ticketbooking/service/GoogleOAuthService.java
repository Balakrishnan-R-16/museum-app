package com.museum.ticketbooking.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/**
 * Verifies Google ID tokens server-side using Google's tokeninfo endpoint.
 * No additional dependency needed — uses Spring's RestTemplate.
 */
@Service
public class GoogleOAuthService {

    @Value("${google.client-id:}")
    private String googleClientId;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Verify a Google ID token and extract user information.
     * Uses Google's tokeninfo endpoint for server-side verification.
     */
    public GoogleUserInfo verifyIdToken(String idToken) {
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new RuntimeException("Google OAuth is not configured. Set GOOGLE_CLIENT_ID environment variable.");
        }

        try {
            // Verify token with Google
            String tokenInfoUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;
            String response = restTemplate.getForObject(tokenInfoUrl, String.class);

            if (response == null) {
                throw new RuntimeException("Invalid Google ID token");
            }

            JsonNode json = objectMapper.readTree(response);

            // Verify the token was issued for our client
            String aud = json.has("aud") ? json.get("aud").asText() : "";
            if (!googleClientId.equals(aud)) {
                throw new RuntimeException("Google token was not issued for this application");
            }

            // Extract user info
            String email = json.has("email") ? json.get("email").asText() : null;
            boolean emailVerified = json.has("email_verified") && json.get("email_verified").asBoolean();
            String name = json.has("name") ? json.get("name").asText() : null;
            String picture = json.has("picture") ? json.get("picture").asText() : null;
            String sub = json.has("sub") ? json.get("sub").asText() : null;

            if (email == null || !emailVerified) {
                throw new RuntimeException("Google account email is not verified");
            }

            if (sub == null) {
                throw new RuntimeException("Invalid Google token: missing subject");
            }

            return new GoogleUserInfo(sub, email, name, picture);

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to verify Google ID token: " + e.getMessage());
        }
    }

    @Getter
    public static class GoogleUserInfo {
        private final String subject;
        private final String email;
        private final String name;
        private final String pictureUrl;

        public GoogleUserInfo(String subject, String email, String name, String pictureUrl) {
            this.subject = subject;
            this.email = email;
            this.name = name;
            this.pictureUrl = pictureUrl;
        }
    }
}
