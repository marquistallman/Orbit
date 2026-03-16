package com.authorizedact.auth_service.features.shared.dtos;

public record AuthResponse(String token, UserDto userDto) {
}
