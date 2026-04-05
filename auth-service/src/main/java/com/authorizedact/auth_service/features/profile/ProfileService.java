package com.authorizedact.auth_service.features.profile;

import com.authorizedact.auth_service.domain.entities.User;
import com.authorizedact.auth_service.domain.repositories.AppActivityLogRepository;
import com.authorizedact.auth_service.domain.repositories.UserOAuthAccountRepository;
import com.authorizedact.auth_service.domain.repositories.UserRepository;
import com.authorizedact.auth_service.features.profile.dtos.ProfileResponse;
import com.authorizedact.auth_service.features.profile.dtos.UpdateProfileRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.ZoneOffset;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository              userRepository;
    private final UserOAuthAccountRepository  oAuthAccountRepository;
    private final AppActivityLogRepository    activityLogRepository;
    private final PasswordEncoder             passwordEncoder;

    @Value("${gmail.service.url:http://localhost:12003}")
    private String gmailServiceUrl;

    @Transactional(readOnly = true)
    public ProfileResponse getUserProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
        return ProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toInstant(ZoneOffset.UTC) : null)
                .updatedAt(user.getUpdatedAt() != null ? user.getUpdatedAt().toInstant(ZoneOffset.UTC) : null)
                .build();
    }

    @Transactional
    public ProfileResponse updateProfile(String email, UpdateProfileRequest req) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        if (req.getUsername() != null && !req.getUsername().isBlank()) {
            user.setUsername(req.getUsername().trim());
        }

        if (req.getNewPassword() != null && !req.getNewPassword().isBlank()) {
            String storedHash = user.getPassword();
            boolean hasPassword = storedHash != null && !storedHash.isBlank();
            if (hasPassword) {
                // Usuario con contraseña existente — requiere la actual
                if (req.getCurrentPassword() == null || req.getCurrentPassword().isBlank()) {
                    throw new IllegalArgumentException("Current password required to set a new one");
                }
                if (!passwordEncoder.matches(req.getCurrentPassword(), storedHash)) {
                    throw new IllegalArgumentException("Current password is incorrect");
                }
            }
            // Usuario OAuth sin contraseña — puede crear una directamente
            user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        }

        user = userRepository.save(user);
        return ProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toInstant(ZoneOffset.UTC) : null)
                .updatedAt(user.getUpdatedAt() != null ? user.getUpdatedAt().toInstant(ZoneOffset.UTC) : null)
                .build();
    }

    @Transactional
    public void deleteAccount(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        // Eliminar emails del Gmail-service antes de borrar el usuario
        try {
            new RestTemplate().delete(gmailServiceUrl + "/emails/delete?userId=" + user.getId());
        } catch (Exception e) {
            System.err.println("Warning: could not delete Gmail emails for user " + user.getId() + ": " + e.getMessage());
        }

        activityLogRepository.deleteByUserId(user.getId());
        oAuthAccountRepository.deleteByUserId(user.getId());
        userRepository.delete(user);
    }
}
