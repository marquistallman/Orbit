package com.authorizedact.auth_service.features.connections.dtos;

import java.util.UUID;

public record ConnectionDto(UUID id, String providerName, String providerUserId, String createdAt) {
}