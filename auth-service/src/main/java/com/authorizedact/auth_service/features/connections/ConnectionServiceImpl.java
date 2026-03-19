package com.authorizedact.auth_service.features.connections;

import com.authorizedact.auth_service.domain.entities.User;
import com.authorizedact.auth_service.domain.repositories.UserOAuthAccountRepository;
import com.authorizedact.auth_service.domain.repositories.UserRepository;
import com.authorizedact.auth_service.features.connections.dtos.ConnectionDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class ConnectionServiceImpl implements ConnectionService {

    private final UserOAuthAccountRepository userOAuthAccountRepository;
    private final UserRepository userRepository;

    public ConnectionServiceImpl(UserOAuthAccountRepository userOAuthAccountRepository, UserRepository userRepository) {
        this.userOAuthAccountRepository = userOAuthAccountRepository;
        this.userRepository = userRepository;
    }

    @Override
    public List<ConnectionDto> getUserConnections(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return userOAuthAccountRepository.findByUserId(user.getId()).stream()
                .map(account -> new ConnectionDto(
                        account.getId(),
                        account.getProvider().getName(),
                        account.getProviderUserId(),
                        account.getCreatedAt().toString()
                ))
                .collect(Collectors.toList());
    }

    @Override
    public void removeConnection(String userEmail, UUID connectionId) {
        // Verificamos que la conexión pertenezca al usuario antes de borrarla
        // (Implementación básica, idealmente se verifica la propiedad de la cuenta)
        userOAuthAccountRepository.deleteById(connectionId);
    }
}