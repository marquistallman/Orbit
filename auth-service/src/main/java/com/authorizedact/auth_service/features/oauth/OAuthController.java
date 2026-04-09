package com.authorizedact.auth_service.features.oauth;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/oauth")
@RequiredArgsConstructor
public class OAuthController {

    private final Auth0ManagementClient auth0ManagementClient;

    /**
     * Devuelve el access token de un proveedor específico desde Auth0.
     * Llama a Auth0 Management API como proxy.
     * 
     * Ej: GET /api/oauth/users/{userId}/token/google
     * Authorization: Bearer <JWT>
     */
    @GetMapping("/users/{userId}/token/{provider}")
    public ResponseEntity<?> getTokenByUserIdAndProvider(
            Authentication authentication,
            @PathVariable String userId,
            @PathVariable String provider) {
        
        // Validar que el usuario esté autenticado
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "No autenticado"));
        }

        try {
            // Llamar a Auth0 Management API para obtener el token del proveedor
            Map<String, Object> providerToken = auth0ManagementClient.getProviderToken(userId, provider);
            return ResponseEntity.ok(providerToken);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(500).body(Map.of("error", "Auth0 M2M no configurado: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of("error", "Token no encontrado: " + e.getMessage()));
        }
    }
}
