package com.authorizedact.auth_service.features.Recover.repositories;

import com.authorizedact.auth_service.features.Recover.entities.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    // NOTE: This repository works with the PasswordResetToken entity.
    // The table for this entity would need to be created via a database migration.

    Optional<PasswordResetToken> findByToken(String token);
}
