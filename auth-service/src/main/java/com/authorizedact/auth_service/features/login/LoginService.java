package com.authorizedact.auth_service.features.login;

import com.authorizedact.auth_service.features.shared.dtos.AuthResponse;

public interface LoginService {
    AuthResponse login(LoginRequest loginRequest);
}