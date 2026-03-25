package com.authorizedact.auth_service.features.oauth;

import com.authorizedact.auth_service.domain.entities.OAuthProvider;
import com.authorizedact.auth_service.domain.entities.User;
import com.authorizedact.auth_service.domain.entities.UserOAuthAccount;
import com.authorizedact.auth_service.domain.repositories.OAuthProviderRepository;
import com.authorizedact.auth_service.domain.repositories.UserOAuthAccountRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OAuthDataSynchronizer {

    private final OAuthProviderRepository oAuthProviderRepository;
    private final UserOAuthAccountRepository userOAuthAccountRepository;

    public OAuthDataSynchronizer(OAuthProviderRepository oAuthProviderRepository, UserOAuthAccountRepository userOAuthAccountRepository) {
        this.oAuthProviderRepository = oAuthProviderRepository;
        this.userOAuthAccountRepository = userOAuthAccountRepository;
    }

    @Transactional
    public void syncOAuthData(User user, String providerName, String providerUserId, String accessToken, String refreshToken) {
        try {
            // 1. Asegurar que existe el Proveedor (ej: "google")
            OAuthProvider provider = oAuthProviderRepository.findByName(providerName)
                    .orElseGet(() -> {
                        OAuthProvider newProvider = new OAuthProvider();
                        newProvider.setName(providerName);
                        // No seteamos ID manual, dejamos que JPA/DB lo genere
                        return oAuthProviderRepository.save(newProvider);
                    });

            // 2. Buscar o crear la vinculación en user_oauth_accounts
            UserOAuthAccount account = userOAuthAccountRepository.findByUserIdAndProviderName(user.getId(), providerName)
                    .orElse(new UserOAuthAccount());

            // Si es nueva, establecemos las relaciones
            if (account.getUser() == null) {
                account.setUser(user);
                account.setProvider(provider);
            }

            // 3. Actualizar datos (tokens y ID remoto)
            account.setProviderUserId(providerUserId);
            
            if (accessToken != null) {
                account.setAccessToken(accessToken);
            }
            
            if (refreshToken != null) {
                account.setRefreshToken(refreshToken);
            }

            userOAuthAccountRepository.save(account);
            System.out.println(">>> OAuth Data Synchronized for user: " + user.getEmail() + " | Provider: " + providerName);

        } catch (Exception e) {
            // Logueamos pero no detenemos el login, para que el usuario pueda entrar aunque falle el guardado de tokens
            System.err.println(">>> Error syncing OAuth data: " + e.getMessage());
            e.printStackTrace();
        }
    }
}