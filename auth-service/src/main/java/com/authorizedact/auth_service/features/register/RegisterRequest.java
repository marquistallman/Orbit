package com.authorizedact.auth_service.features.register;

public record RegisterRequest(String username, String email, String password) {
}