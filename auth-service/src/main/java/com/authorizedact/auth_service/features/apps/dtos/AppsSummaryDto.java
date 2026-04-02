package com.authorizedact.auth_service.features.apps.dtos;

import lombok.Data;

@Data
public class AppsSummaryDto {
    private int connected;
    private int available;
    private int errors;
    private int uptime;
}
