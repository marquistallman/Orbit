package com.authorizedact.auth_service.application.services;

import com.authorizedact.auth_service.application.dtos.AuthResponse;
import com.authorizedact.auth_service.application.dtos.LoginRequest;
import com.authorizedact.auth_service.application.dtos.RegisterRequest;
import com.authorizedact.auth_service.domain.entities.User;

public interface AuthService {
    AuthResponse register(RegisterRequest registerRequest);
    AuthResponse login(LoginRequest loginRequest);
}
