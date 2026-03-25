// c:\Users\davir\OneDrive\Documentos\NetBeansProjects\Orbit\auth-service\src\main\java\com\authorizedact\auth_service\infrastructure\security\OAuth2AuthenticationSuccessHandler.java

package com.authorizedact.auth_service.infrastructure.security;

import com.authorizedact.auth_service.domain.entities.User;
import com.authorizedact.auth_service.domain.repositories.UserRepository;
import com.authorizedact.auth_service.features.oauth.OAuthDataSynchronizer;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Optional;

@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final OAuth2AuthorizedClientService authorizedClientService;
    private final OAuthDataSynchronizer oAuthDataSynchronizer;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public OAuth2AuthenticationSuccessHandler(JwtService jwtService, UserRepository userRepository, OAuth2AuthorizedClientService authorizedClientService, OAuthDataSynchronizer oAuthDataSynchronizer) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.authorizedClientService = authorizedClientService;
        this.oAuthDataSynchronizer = oAuthDataSynchronizer;
    }

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        System.out.println("--- OAuth2 Login Success: Processing start ---");
        
        try {
            OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
            // Validar si el email viene en los atributos
            String emailAttr = oAuth2User.getAttribute("email");
            if (emailAttr == null) {
                throw new RuntimeException("Email not found in OAuth2 provider response");
            }
            
            String email = emailAttr.toLowerCase(); // Normalizar a minúsculas
            String name = oAuth2User.getAttribute("name");

            Optional<User> userOptional = userRepository.findByEmail(email);
            User user;

            if (userOptional.isPresent()) {
                System.out.println("User found: " + email);
                user = userOptional.get();
                // FIX: Si el usuario existente no tiene username (de pruebas anteriores), lo asignamos
                if (user.getUsername() == null || user.getUsername().isEmpty()) {
                    user.setUsername(name != null ? name : email);
                }
            } else {
                System.out.println("User not found, provisioning: " + email);
                // Provisioning: Crear usuario automáticamente si no existe
                user = new User();
                user.setEmail(email);
                // Usamos el nombre de Google o el email como username
                user.setUsername(name != null ? name : email);
                user.setPassword(""); // Password vacío para usuarios sociales
            }

            // --- CAPTURAR TOKENS DE GOOGLE PARA EL GMAIL-SERVICE ---
            String accessToken = null;
            String refreshToken = null;
            String providerName = "unknown";

            if (authentication instanceof OAuth2AuthenticationToken oauthToken) {
                providerName = oauthToken.getAuthorizedClientRegistrationId();
                OAuth2AuthorizedClient client = authorizedClientService.loadAuthorizedClient(
                        providerName,
                        oauthToken.getName());
                
                if (client != null && client.getAccessToken() != null) {
                    System.out.println("Saving Google Access Token for user: " + email);
                    accessToken = client.getAccessToken().getTokenValue();
                    // user.setAccessToken(...) -> Mantenemos esto si lo usas en el User entity temporalmente, 
                    // pero la data real se irá al Synchronizer.
                    user.setAccessToken(accessToken);
                    
                    if (client.getRefreshToken() != null) {
                        refreshToken = client.getRefreshToken().getTokenValue();
                        user.setRefreshToken(refreshToken);
                    }
                }
            }
            // Guardamos el usuario con los tokens actualizados
            user = userRepository.save(user);

            // --- NUEVO PASO: Sincronizar datos con tablas relacionales (oauth_providers, user_oauth_accounts) ---
            // Esto asegura que init.sql se respete y los datos estén disponibles para otros servicios.
            oAuthDataSynchronizer.syncOAuthData(
                    user, 
                    providerName, 
                    oAuth2User.getName(), // ID del usuario en Google
                    accessToken, 
                    refreshToken
            );
            // ----------------------------------------------------------------------------------------------------

            // Generar Token JWT
            String token = jwtService.generateToken(user);
            System.out.println("JWT generated successfully for user ID: " + user.getId());

            // Redirigir al frontend con el token y datos de usuario en la URL
            String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth-callback")
                    .queryParam("token", token)
                    .queryParam("userId", user.getId())
                    .queryParam("username", user.getUsername())
                    .queryParam("email", user.getEmail())
                    .build().toUriString();

            System.out.println("Redirecting to frontend: " + targetUrl);
            getRedirectStrategy().sendRedirect(request, response, targetUrl);
        } catch (Exception e) {
            e.printStackTrace();
            // Aseguramos que el error también vaya a la página de callback
            String errorUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth-callback")
                    .queryParam("error", "OAuth Error: " + e.getMessage())
                    .build().toUriString();
            getRedirectStrategy().sendRedirect(request, response, errorUrl);
        }
    }
}
