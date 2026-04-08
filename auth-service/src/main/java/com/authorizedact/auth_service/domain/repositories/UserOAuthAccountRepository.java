package com.authorizedact.auth_service.domain.repositories;

import com.authorizedact.auth_service.domain.entities.UserOAuthAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserOAuthAccountRepository extends JpaRepository<UserOAuthAccount, UUID> {
    List<UserOAuthAccount> findByUserId(UUID userId);
    
    // ESTA ES LA QUE NECESITAMOS PARA EL SYNCHRONIZER:
    Optional<UserOAuthAccount> findByProviderNameAndProviderUserId(String providerName, String providerUserId);
    
    Optional<UserOAuthAccount> findByUserIdAndProviderName(UUID userId, String providerName);
    void deleteByUserId(UUID userId);
}