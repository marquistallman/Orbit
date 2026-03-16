package com.authorizedact.auth_service.features.connections;

import com.authorizedact.auth_service.features.connections.dtos.ConnectionDto;

import java.util.List;
import java.util.UUID;

public interface ConnectionService {
    List<ConnectionDto> getUserConnections(String userEmail);
    void removeConnection(String userEmail, UUID connectionId);
}