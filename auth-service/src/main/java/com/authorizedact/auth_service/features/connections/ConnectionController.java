package com.authorizedact.auth_service.features.connections;

import com.authorizedact.auth_service.features.connections.dtos.ConnectionDto;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/connections")
@PreAuthorize("isAuthenticated()") // Asegura que solo usuarios autenticados puedan acceder
public class ConnectionController {

    private final ConnectionService connectionService;

    public ConnectionController(ConnectionService connectionService) {
        this.connectionService = connectionService;
    }

    @GetMapping
    public ResponseEntity<List<ConnectionDto>> getConnections() {
        // El filtro JWT ya ha validado al usuario y establecido su identidad.
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(connectionService.getUserConnections(email));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConnection(@PathVariable UUID id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        connectionService.removeConnection(email, id);
        return ResponseEntity.noContent().build();
    }
}