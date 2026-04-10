package com.authorizedact.auth_service.features.oauth;

import com.authorizedact.auth_service.domain.entities.User;
import com.authorizedact.auth_service.domain.entities.UserOAuthAccount;
import com.authorizedact.auth_service.domain.repositories.UserOAuthAccountRepository;
import com.authorizedact.auth_service.domain.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/oauth")
@RequiredArgsConstructor
public class OAuthController {

    private final Auth0ManagementClient auth0ManagementClient;
    private final UserRepository userRepository;
    private final UserOAuthAccountRepository userOAuthAccountRepository;

    /**
     * Devuelve el access token de un proveedor específico desde Auth0.
     * Llama a Auth0 Management API como proxy.
     * 
     * Ej: GET /api/oauth/users/{userId}/token/google
     * Authorization: Bearer <JWT> (opcional - para validar permisos)
     * 
     * El userId es el UUID interno de la app; se convierte a Auth0 sub para consultar Auth0.
     * Accesible por servicios internos (gmail-service) sin autenticación.
     */
    @GetMapping("/users/{userId}/token/{provider}")
    public ResponseEntity<?> getTokenByUserIdAndProvider(
            Authentication authentication,
            @PathVariable String userId,
            @PathVariable String provider) {
        
        // No requiere autenticación - es un endpoint de servicio a servicio
        // Authorization es opcional y se usa solo para auditoría
        
        try {
            // 1. Buscar el User por UUID interno
            UUID userUUID = UUID.fromString(userId);
            Optional<User> user = userRepository.findById(userUUID);
            
            if (user.isEmpty()) {
                log.warn("[OAuthController] User no encontrado con UUID: {}", userId);
                return ResponseEntity.status(404).body(Map.of("error", "Usuario no encontrado"));
            }

            // 2. Buscar la cuenta OAuth con Auth0 para obtener el Auth0 sub (providerUserId)
            Optional<UserOAuthAccount> auth0Account = userOAuthAccountRepository
                    .findByUserIdAndProviderName(userUUID, "auth0");
            
            if (auth0Account.isEmpty()) {
                log.warn("[OAuthController] User {} no tiene cuenta Auth0 vinculada", userId);
                return ResponseEntity.status(404).body(Map.of("error", "Usuario no tiene Auth0 vinculada"));
            }

            String auth0Sub = auth0Account.get().getProviderUserId();
            log.info("[OAuthController] Resolviendo {} para Auth0 sub: {} (caller: {})", 
                    userId, auth0Sub, authentication != null ? authentication.getName() : "unauthenticated");

            // 3. Llamar a Auth0 Management API con el Auth0 sub
            Map<String, Object> providerToken = auth0ManagementClient.getProviderToken(auth0Sub, provider);
            return ResponseEntity.ok(providerToken);
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(Map.of("error", "UUID inválido: " + e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(500).body(Map.of("error", "Auth0 M2M no configurado: " + e.getMessage()));
        } catch (Exception e) {
            log.error("[OAuthController] Error obteniendo token: {}", e.getMessage(), e);
            return ResponseEntity.status(404).body(Map.of("error", "Token no encontrado: " + e.getMessage()));
        }
    }
}
