package com.authorizedact.auth_service.features.shared.dtos;

import java.util.UUID;

public record UserDto(UUID id, String username, String email) {
}
