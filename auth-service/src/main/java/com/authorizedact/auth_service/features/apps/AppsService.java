package com.authorizedact.auth_service.features.apps;

import com.authorizedact.auth_service.domain.entities.AppActivityLog;
import com.authorizedact.auth_service.domain.entities.User;
import com.authorizedact.auth_service.domain.entities.UserOAuthAccount;
import com.authorizedact.auth_service.domain.repositories.AppActivityLogRepository;
import com.authorizedact.auth_service.domain.repositories.UserOAuthAccountRepository;
import com.authorizedact.auth_service.domain.repositories.UserRepository;
import com.authorizedact.auth_service.features.apps.dtos.ActivityLogDto;
import com.authorizedact.auth_service.features.apps.dtos.AppDto;
import com.authorizedact.auth_service.features.apps.dtos.AppsSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppsService {

    private final UserRepository userRepository;
    private final UserOAuthAccountRepository userOAuthAccountRepository;
    private final AppActivityLogRepository activityLogRepository;

    private static final List<Map<String, String>> APP_CATALOG = List.of(
        Map.of("id", "google",   "name", "Google",   "description", "Gmail & Calendar",     "category", "productivity", "color", "#c47070", "icon", "✉"),
        Map.of("id", "github",   "name", "GitHub",   "description", "Code repositories",    "category", "development",  "color", "#6e7680", "icon", "⌥"),
        Map.of("id", "linkedin", "name", "LinkedIn", "description", "Professional network", "category", "social",       "color", "#0A66C2", "icon", "in"),
        Map.of("id", "facebook", "name", "Facebook", "description", "Social network",       "category", "social",       "color", "#1877F2", "icon", "f")
    );

    public List<AppDto> getConnectedApps(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        List<UserOAuthAccount> accounts = userOAuthAccountRepository.findByUserId(user.getId());
        Set<String> connectedProviders = accounts.stream()
            .map(a -> a.getProvider().getName())
            .collect(Collectors.toSet());

        return APP_CATALOG.stream()
            .filter(app -> connectedProviders.contains(app.get("id")))
            .map(app -> {
                UserOAuthAccount account = accounts.stream()
                    .filter(a -> a.getProvider().getName().equals(app.get("id")))
                    .findFirst().orElse(null);
                return buildAppDto(app, account);
            })
            .collect(Collectors.toList());
    }

    public List<AppDto> getAvailableApps(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        List<UserOAuthAccount> accounts = userOAuthAccountRepository.findByUserId(user.getId());
        Set<String> connectedProviders = accounts.stream()
            .map(a -> a.getProvider().getName())
            .collect(Collectors.toSet());

        return APP_CATALOG.stream()
            .filter(app -> !connectedProviders.contains(app.get("id")))
            .map(app -> buildAppDto(app, null))
            .collect(Collectors.toList());
    }

    private AppDto buildAppDto(Map<String, String> catalog, UserOAuthAccount account) {
        AppDto dto = new AppDto();
        dto.setId(catalog.get("id"));
        dto.setName(catalog.get("name"));
        dto.setDescription(catalog.get("description"));
        dto.setCategory(catalog.get("category"));
        dto.setColor(catalog.get("color"));
        dto.setIcon(catalog.get("icon"));
        dto.setUsage(0);

        if (account == null) {
            dto.setStatus("disconnected");
            dto.setMeta("");
        } else if (account.getRefreshToken() == null || account.getRefreshToken().isEmpty()) {
            dto.setStatus("error");
            dto.setMeta("No refresh token — reconnect required");
        } else {
            dto.setStatus("connected");
            dto.setMeta("Connected · refresh token active");
        }
        return dto;
    }

    public List<ActivityLogDto> getActivityLog(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("HH:mm");

        return activityLogRepository.findTop20ByUserIdOrderByCreatedAtDesc(user.getId()).stream()
            .map(log -> {
                ActivityLogDto dto = new ActivityLogDto();
                dto.setId(log.getId().toString());
                dto.setApp(log.getAppName());
                dto.setMessage(log.getMessage());
                dto.setTime(log.getCreatedAt().format(fmt));
                dto.setType(log.getType());
                return dto;
            })
            .collect(Collectors.toList());
    }

    public AppsSummaryDto getSummary(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        List<UserOAuthAccount> accounts = userOAuthAccountRepository.findByUserId(user.getId());
        Set<String> connectedProviders = accounts.stream()
            .map(a -> a.getProvider().getName())
            .collect(Collectors.toSet());

        int connected = (int) accounts.stream()
            .filter(a -> a.getRefreshToken() != null && !a.getRefreshToken().isEmpty())
            .count();
        int errors = (int) accounts.stream()
            .filter(a -> a.getRefreshToken() == null || a.getRefreshToken().isEmpty())
            .count();
        int available = (int) APP_CATALOG.stream()
            .filter(app -> !connectedProviders.contains(app.get("id")))
            .count();

        AppsSummaryDto dto = new AppsSummaryDto();
        dto.setConnected(connected);
        dto.setAvailable(available);
        dto.setErrors(errors);
        dto.setUptime(connected > 0 ? 100 : 0);
        return dto;
    }

    @Transactional
    public void disconnectApp(String email, String provider) {
        User user = userRepository.findByEmail(email).orElseThrow();
        UserOAuthAccount account = userOAuthAccountRepository
            .findByUserIdAndProviderName(user.getId(), provider)
            .orElseThrow(() -> new RuntimeException("App not connected"));

        userOAuthAccountRepository.delete(account);
        logActivity(user, getAppName(provider), "Disconnected by user", "info");
    }

    @Transactional
    public void renewToken(String email, String provider) {
        if (!provider.equals("google")) {
            throw new RuntimeException("Token renewal only supported for Google");
        }

        User user = userRepository.findByEmail(email).orElseThrow();
        UserOAuthAccount account = userOAuthAccountRepository
            .findByUserIdAndProviderName(user.getId(), provider)
            .orElseThrow(() -> new RuntimeException("App not connected"));

        if (account.getRefreshToken() == null || account.getRefreshToken().isEmpty()) {
            logActivity(user, "Google", "Token renewal failed — no refresh token", "error");
            throw new RuntimeException("No refresh token available. Please reconnect.");
        }

        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("refresh_token", account.getRefreshToken());
            body.add("grant_type", "refresh_token");

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                "https://oauth2.googleapis.com/token", HttpMethod.POST, request,
                new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {});

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String newAccessToken = (String) response.getBody().get("access_token");
                account.setAccessToken(newAccessToken);
                userOAuthAccountRepository.save(account);
                logActivity(user, "Google", "Access token renewed successfully", "success");
            } else {
                logActivity(user, "Google", "Token renewal failed", "error");
                throw new RuntimeException("Token renewal failed");
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            logActivity(user, "Google", "Token renewal error: " + e.getMessage(), "error");
            throw new RuntimeException("Token renewal failed: " + e.getMessage());
        }
    }

    public void logActivity(User user, String appName, String message, String type) {
        AppActivityLog log = new AppActivityLog();
        log.setUser(user);
        log.setAppName(appName);
        log.setMessage(message);
        log.setType(type);
        activityLogRepository.save(log);
    }

    private String getAppName(String provider) {
        return APP_CATALOG.stream()
            .filter(app -> app.get("id").equals(provider))
            .map(app -> app.get("name"))
            .findFirst()
            .orElse(provider);
    }
}
