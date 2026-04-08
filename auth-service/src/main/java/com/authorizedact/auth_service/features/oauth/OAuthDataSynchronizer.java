package com.authorizedact.auth_service.features.oauth;

import com.authorizedact.auth_service.domain.entities.OAuthProvider;
import com.authorizedact.auth_service.domain.entities.User;
import com.authorizedact.auth_service.domain.entities.UserOAuthAccount;
import com.authorizedact.auth_service.domain.repositories.OAuthProviderRepository;
import com.authorizedact.auth_service.domain.repositories.UserOAuthAccountRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class OAuthDataSynchronizer {

    private final OAuthProviderRepository oAuthProviderRepository;
    private final UserOAuthAccountRepository userOAuthAccountRepository;

    public OAuthDataSynchronizer(OAuthProviderRepository oAuthProviderRepository, 
                                UserOAuthAccountRepository userOAuthAccountRepository) {
        this.oAuthProviderRepository = oAuthProviderRepository;
        this.userOAuthAccountRepository = userOAuthAccountRepository;
    }

    @Transactional
    public void syncOAuthData(User user, String providerName, String providerUserId, String accessToken, String refreshToken) {
        try {
            // 1. Asegurar que existe el Proveedor (Ahora será "auth0")
            OAuthProvider provider = oAuthProviderRepository.findByName(providerName)
                    .orElseGet(() -> {
                        OAuthProvider newProvider = new OAuthProvider();
                        newProvider.setName(providerName);
                        return oAuthProviderRepository.save(newProvider);
                    });

            // 2. Buscar por Provider + ProviderUserId (el 'sub' de Auth0)
            // Esto es mucho más seguro que buscar por ID de usuario interno
            UserOAuthAccount account = userOAuthAccountRepository
                    .findByProviderNameAndProviderUserId(providerName, providerUserId)
                    .orElseGet(() -> {
                        UserOAuthAccount newAccount = new UserOAuthAccount();
                        newAccount.setUser(user);
                        newAccount.setProvider(provider);
                        newAccount.setProviderUserId(providerUserId);
                        return newAccount;
                    });

            // 3. Actualizar tokens y estampa de tiempo
            if (accessToken != null) {
                account.setAccessToken(accessToken);
                // Asumimos 1 hora de expiración estándar si Auth0 no nos da el dato exacto aún
                account.setExpiresAt(LocalDateTime.now().plusHours(1)); 
            }
            
            if (refreshToken != null) {
                account.setRefreshToken(refreshToken);
            }

            userOAuthAccountRepository.save(account);
            System.out.println(">>> OAuth Sync Success | User: " + user.getEmail() + " | Provider: " + providerName + " | ID: " + providerUserId);

        } catch (Exception e) {
            System.err.println(">>> Error syncing OAuth data: " + e.getMessage());
            e.printStackTrace();
        }
    }
}