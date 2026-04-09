package com.authorizedact.auth_service.features.oauth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class Auth0ManagementClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${AUTH0_DOMAIN:dev-abc123.us.auth0.com}")
    private String auth0Domain;

    @Value("${AUTH0_M2M_CLIENT_ID:}")
    private String m2mClientId;

    @Value("${AUTH0_M2M_CLIENT_SECRET:}")
    private String m2mClientSecret;

    private String m2mAccessToken = null;
    private long m2mTokenExpiry = 0;

    /**
     * Obtiene el token de un proveedor específico (ej: google-oauth2) para un usuario desde Auth0.
     * Llama a Auth0 Management API para obtener los identities del usuario.
     */
    public Map<String, Object> getProviderToken(String userId, String provider) throws Exception {
        if (!isValidConfiguration()) {
            throw new IllegalStateException("Auth0 M2M credentials no están configuradas");
        }

        // Obtener M2M token de Auth0
        String accessToken = getM2MAccessToken();

        // Llamar a Management API para obtener identities del usuario
        String url = String.format("https://%s/api/v2/users/%s/identities", auth0Domain, userId);

        try {
            Map<String, String> headers = new HashMap<>();
            headers.put("Authorization", "Bearer " + accessToken);
            headers.put("Content-Type", "application/json");

            // Hacer GET request
            String response = restTemplate.getForObject(url, String.class);
            log.debug("Auth0 Management API response: {}", response);

            // Parsear response
            JsonNode identities = objectMapper.readTree(response);
            
            // Buscar el identity del proveedor específico (ej: "google-oauth2")
            for (JsonNode identity : identities) {
                String identityProvider = identity.get("provider").asText();
                
                // Mapear nombres de providers
                if (matchesProvider(identityProvider, provider)) {
                    // Extraer el token
                    JsonNode identityData = identity.get("identity_data");
                    if (identityData != null) {
                        Map<String, Object> result = new HashMap<>();
                        result.put("accessToken", identityData.get("access_token").asText(""));
                        result.put("refreshToken", identityData.get("refresh_token").asText(""));
                        result.put("expiresAt", identityData.get("expires_at").asText(""));
                        result.put("provider", provider);
                        result.put("rawProvider", identityProvider);
                        return result;
                    }
                }
            }

            throw new Exception(String.format("No se encontró identity para provider: %s", provider));

        } catch (Exception e) {
            log.error("Error obtiendo identidades de Auth0: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * Obtiene un M2M access token de Auth0.
     * Cachea el token hasta que esté cerca de expirar.
     */
    private String getM2MAccessToken() throws Exception {
        // Si el token está en caché y no ha expirado, usarlo
        if (m2mAccessToken != null && System.currentTimeMillis() < m2mTokenExpiry) {
            return m2mAccessToken;
        }

        String url = String.format("https://%s/oauth/token", auth0Domain);

        Map<String, String> body = new HashMap<>();
        body.put("client_id", m2mClientId);
        body.put("client_secret", m2mClientSecret);
        body.put("audience", String.format("https://%s/api/v2/", auth0Domain));
        body.put("grant_type", "client_credentials");

        try {
            String response = restTemplate.postForObject(url, body, String.class);
            JsonNode responseJson = objectMapper.readTree(response);

            m2mAccessToken = responseJson.get("access_token").asText();
            long expiresIn = responseJson.get("expires_in").asLong(3600);
            
            // Cachear hasta 5 minutos antes de expirar
            m2mTokenExpiry = System.currentTimeMillis() + (expiresIn * 1000) - (5 * 60 * 1000);

            log.info("Nuevo M2M token obtenido de Auth0, expira en {} segundos", expiresIn);
            return m2mAccessToken;

        } catch (Exception e) {
            log.error("Error obteniendo M2M token de Auth0: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * Verifica si el identity provider coincide con el provider solicitado.
     * Mapea nombres de Auth0 a nombres canónicos.
     */
    private boolean matchesProvider(String auth0Provider, String requestedProvider) {
        // Mapeo de nombres de Auth0 a nombres canónicos
        Map<String, String> providerMap = new HashMap<>();
        providerMap.put("google-oauth2", "google");
        providerMap.put("github", "github");
        providerMap.put("facebook", "facebook");
        providerMap.put("auth0", "auth0");

        String canonical = providerMap.getOrDefault(auth0Provider, auth0Provider);
        return canonical.equalsIgnoreCase(requestedProvider);
    }

    /**
     * Valida que las credenciales de M2M estén configuradas.
     */
    private boolean isValidConfiguration() {
        return m2mClientId != null && !m2mClientId.isEmpty() &&
               m2mClientSecret != null && !m2mClientSecret.isEmpty();
    }
}
