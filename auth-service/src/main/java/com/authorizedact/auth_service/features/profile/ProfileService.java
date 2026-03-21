package com.authorizedact.auth_service.features.profile;

import com.authorizedact.auth_service.domain.entities.User;
import com.authorizedact.auth_service.domain.repositories.UserRepository;
import com.authorizedact.auth_service.features.profile.dtos.ProfileResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ProfileResponse getUserProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        return ProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toInstant(ZoneOffset.UTC) : null)
                .updatedAt(user.getUpdatedAt() != null ? user.getUpdatedAt().toInstant(ZoneOffset.UTC) : null)
                .build();
    }
}
