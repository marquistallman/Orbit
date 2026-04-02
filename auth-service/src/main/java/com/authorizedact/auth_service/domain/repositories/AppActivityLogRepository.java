package com.authorizedact.auth_service.domain.repositories;

import com.authorizedact.auth_service.domain.entities.AppActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AppActivityLogRepository extends JpaRepository<AppActivityLog, UUID> {
    List<AppActivityLog> findTop20ByUserIdOrderByCreatedAtDesc(UUID userId);
}
