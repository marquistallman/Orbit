package com.authorizedact.auth_service.application.dtos;

import lombok.Data;

@Data
public class LoginRequest {
    private String email;
    private String password;
}
