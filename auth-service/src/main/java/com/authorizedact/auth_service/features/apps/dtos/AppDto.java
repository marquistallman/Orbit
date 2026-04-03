package com.authorizedact.auth_service.features.apps.dtos;

import lombok.Data;

@Data
public class AppDto {
    private String id;
    private String name;
    private String description;
    private String category;
    private String status;
    private String meta;
    private int usage;
    private String color;
    private String icon;
}
