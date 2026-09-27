package com.museum.ticketbooking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;

/**
 * Visitor entity — represents an authenticated visitor (email/password or Google OAuth).
 * Evolved from the original User entity; keeps the same table name for backward compatibility.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Visitor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    /** Nullable — Google-only visitors won't have a password */
    private String password;

    private String name;

    @Column(name = "display_name")
    private String displayName;

    /** Kept nullable for legacy; never collected from new bookings */
    private String phone;

    @Column(name = "auth_provider", length = 20)
    @Enumerated(EnumType.STRING)
    private AuthProvider authProvider = AuthProvider.LOCAL;

    /** Google subject ID for account linking */
    @Column(name = "google_subject")
    private String googleSubject;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Get the best display name available */
    public String getEffectiveDisplayName() {
        if (displayName != null && !displayName.isBlank()) return displayName;
        if (name != null && !name.isBlank()) return name;
        if (email != null) return email.split("@")[0];
        return "Visitor";
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (authProvider == null) authProvider = AuthProvider.LOCAL;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum AuthProvider {
        LOCAL, GOOGLE
    }
}
