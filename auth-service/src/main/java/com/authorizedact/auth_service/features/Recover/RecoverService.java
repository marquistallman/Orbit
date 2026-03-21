package com.authorizedact.auth_service.features.Recover;

import com.authorizedact.auth_service.domain.entities.User;
import com.authorizedact.auth_service.domain.repositories.UserRepository;
import com.authorizedact.auth_service.features.Recover.entities.PasswordResetToken;
import com.authorizedact.auth_service.features.Recover.repositories.PasswordResetTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RecoverService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;

    // --- In-Memory Simulation for Password Reset Tokens ---
    // This map is used to simulate the database persistence of reset tokens
    // because we cannot add a new table to the database schema right now.
    // In a real application, you would use the PasswordResetTokenRepository
    // to save and retrieve these tokens from the database.
    private final Map<String, PasswordResetToken> simulatedTokenDb = new HashMap<>();

    @Transactional
    public String requestPasswordReset(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User with email " + email + " not found."));

        // Generate a new token
        String token = UUID.randomUUID().toString();
        Instant expiryDate = Instant.now().plus(1, ChronoUnit.HOURS);

        // Create the token entity
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setToken(token);
        resetToken.setUser(user);
        resetToken.setExpiryDate(expiryDate);

        // --- SIMULATION ---
        // passwordResetTokenRepository.save(resetToken); // This is what you WOULD do.
        simulatedTokenDb.put(token, resetToken);
        System.out.println("Simulating save for token: " + token);
        // --- END SIMULATION ---

        // In a real app, you'd email this token to the user.
        // For now, we return it for testing purposes.
        return token;
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        // --- SIMULATION ---
        // PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token)
        //        .orElseThrow(() -> new RuntimeException("Invalid password reset token."));
        if (!simulatedTokenDb.containsKey(token)) {
            throw new RuntimeException("Invalid or expired password reset token.");
        }
        PasswordResetToken resetToken = simulatedTokenDb.get(token);
        // --- END SIMULATION ---


        if (resetToken.getExpiryDate().isBefore(Instant.now())) {
            // --- SIMULATION ---
            // passwordResetTokenRepository.delete(resetToken);
            simulatedTokenDb.remove(token);
            // --- END SIMULATION ---
            throw new RuntimeException("Expired password reset token.");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // --- SIMULATION ---
        // The token has been used, so it should be deleted.
        // passwordResetTokenRepository.delete(resetToken);
        simulatedTokenDb.remove(token);
        System.out.println("Simulating delete for used token: " + token);
        // --- END SIMULATION ---
    }
}
