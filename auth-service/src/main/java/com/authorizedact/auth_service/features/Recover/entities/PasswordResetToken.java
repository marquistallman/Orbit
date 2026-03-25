package com.authorizedact.auth_service.features.Recover.entities;

import com.authorizedact.auth_service.domain.entities.User;
import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {

    // NOTE: This entity is defined for conceptual purposes.
    // A database migration would be needed to create the 'password_reset_tokens' table.

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String token;

    @ManyToOne(targetEntity = User.class, fetch = FetchType.EAGER)
    @JoinColumn(nullable = false, name = "user_id")
    private User user;

    @Column(nullable = false)
    private Instant expiryDate;
}
