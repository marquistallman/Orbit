package com.authorizedact.auth_service.features.apps.dtos;

import lombok.Data;

@Data
public class ActivityLogDto {
    private String id;
    private String app;
    private String message;
    private String time;
    private String type;
}
