package com.authorizedact.auth_service.features.register;

import com.authorizedact.auth_service.features.shared.dtos.AuthResponse;

public interface RegisterService {
    AuthResponse register(RegisterRequest registerRequest);
}