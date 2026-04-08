package com.authorizedact.auth_service.infrastructure.security;

import com.authorizedact.auth_service.domain.entities.AppActivityLog;
import com.authorizedact.auth_service.domain.entities.User;
import com.authorizedact.auth_service.domain.repositories.AppActivityLogRepository;
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
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Optional;

@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final OAuth2AuthorizedClientService authorizedClientService;
    private final OAuthDataSynchronizer oAuthDataSynchronizer;
    private final AppActivityLogRepository activityLogRepository;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public OAuth2AuthenticationSuccessHandler(UserRepository userRepository, 
                                            OAuth2AuthorizedClientService authorizedClientService, 
                                            OAuthDataSynchronizer oAuthDataSynchronizer, 
                                            AppActivityLogRepository activityLogRepository) {
        this.userRepository = userRepository;
        this.authorizedClientService = authorizedClientService;
        this.oAuthDataSynchronizer = oAuthDataSynchronizer;
        this.activityLogRepository = activityLogRepository;
    }

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        
        try {
            OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
            // Auth0 suele enviar el email en el atributo "email"
            String email = Optional.ofNullable((String) oAuth2User.getAttribute("email"))
                    .map(String::toLowerCase)
                    .orElseThrow(() -> new RuntimeException("Email not found in Auth0 response"));
            
            String name = oAuth2User.getAttribute("name");
            String auth0Id = oAuth2User.getAttribute("sub"); // El ID único de Auth0

            // 1. Sincronizar Usuario Principal
            User user = userRepository.findByEmail(email).orElseGet(() -> {
                User newUser = new User();
                newUser.setEmail(email);
                newUser.setPassword(""); // Innecesario con Auth0 pero mantiene compatibilidad DB
                return newUser;
            });

            user.setUsername(name != null ? name : email);
            // IMPORTANTE: Deberías tener un campo 'auth0Id' en tu entidad User
            // user.setAuth0Id(auth0Id); 
            
            user = userRepository.save(user);

            // 2. Capturar Tokens (Para Gmail-service y otros)
            String accessToken = null;
            String refreshToken = null;
            String providerName = "auth0";

            if (authentication instanceof OAuth2AuthenticationToken oauthToken) {
                OAuth2AuthorizedClient client = authorizedClientService.loadAuthorizedClient(
                        oauthToken.getAuthorizedClientRegistrationId(),
                        oauthToken.getName());
                
                if (client != null) {
                    accessToken = client.getAccessToken().getTokenValue();
                    if (client.getRefreshToken() != null) {
                        refreshToken = client.getRefreshToken().getTokenValue();
                    }
                }
            }

            // 3. Sincronizar con tablas relacionales de OAuth
            oAuthDataSynchronizer.syncOAuthData(user, providerName, auth0Id, accessToken, refreshToken);

            // 4. Log de actividad
            AppActivityLog activityLog = new AppActivityLog();
            activityLog.setUser(user);
            activityLog.setAppName("Auth0");
            activityLog.setMessage("Login exitoso vía Auth0");
            activityLog.setType("success");
            activityLogRepository.save(activityLog);

            // 5. Redirección final al Frontend usando el token de Auth0
            // Obtenemos el token que Auth0 nos envió al Backend
            String tokenDeAuth0 = "";
            if (authentication instanceof OAuth2AuthenticationToken oauthToken) {
                OAuth2AuthorizedClient client = authorizedClientService.loadAuthorizedClient(
                oauthToken.getAuthorizedClientRegistrationId(),
                oauthToken.getName());
            if (client != null) {
                tokenDeAuth0 = client.getAccessToken().getTokenValue();
                }
}

            String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth-callback")
        .queryParam("token", tokenDeAuth0) // Pasamos el token de Auth0 directamente
        .build().toUriString();

            getRedirectStrategy().sendRedirect(request, response, targetUrl);

        } catch (Exception e) {
            String errorUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/login")
                    .queryParam("error", e.getMessage())
                    .build().toUriString();
            getRedirectStrategy().sendRedirect(request, response, errorUrl);
        }
    }
}