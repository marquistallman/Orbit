package com.authorizedact.auth_service.features.profile.dtos;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String username;
    private String currentPassword;
    private String newPassword;
}
