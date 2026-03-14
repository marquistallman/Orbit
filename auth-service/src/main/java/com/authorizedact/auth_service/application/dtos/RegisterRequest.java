package com.authorizedact.auth_service.application.dtos;

import lombok.Data;

@Data
public class RegisterRequest {
    private String email;
    private String username;
    private String password;
}
