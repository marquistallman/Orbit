// c:\Users\davir\OneDrive\Documentos\NetBeansProjects\Orbit\auth-service\src\main\java\com\authorizedact\auth_service\infrastructure\security\OAuth2AuthenticationSuccessHandler.java

package com.authorizedact.auth_service.infrastructure.security;

import com.authorizedact.auth_service.domain.entities.User;
import com.authorizedact.auth_service.domain.repositories.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
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

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public OAuth2AuthenticationSuccessHandler(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
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
                    user = userRepository.save(user);
                }
            } else {
                System.out.println("User not found, provisioning: " + email);
                // Provisioning: Crear usuario automáticamente si no existe
                user = new User();
                user.setEmail(email);
                // Usamos el nombre de Google o el email como username
                user.setUsername(name != null ? name : email);
                user.setPassword(""); // Password vacío para usuarios sociales
                user = userRepository.save(user);
            }

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
