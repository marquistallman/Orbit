package com.authorizedact.auth_service.application.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.UUID;

@Data
@AllArgsConstructor
public class UserDto {
    private UUID id;
    private String name;
    private String email;
}