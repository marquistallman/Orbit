package com.authorizedact.auth_service.features.Recover.dtos;

import lombok.Data;

@Data
public class PasswordRecoverRequest {
    private String email;
}
