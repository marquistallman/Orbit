package com.authorizedact.auth_service.features.profile.dtos;

import java.time.Instant;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProfileResponse {
    private UUID id;
    private String email;
    private String username;
    private Instant createdAt;
    private Instant updatedAt;
}
