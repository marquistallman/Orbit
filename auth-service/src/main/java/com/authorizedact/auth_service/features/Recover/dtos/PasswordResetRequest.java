package com.authorizedact.auth_service.features.Recover.dtos;

import lombok.Data;

@Data
public class PasswordResetRequest {
    private String token;
    private String newPassword;
}
