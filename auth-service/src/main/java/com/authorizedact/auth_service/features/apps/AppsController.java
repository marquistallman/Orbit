package com.authorizedact.auth_service.features.apps;

import com.authorizedact.auth_service.features.apps.dtos.ActivityLogDto;
import com.authorizedact.auth_service.features.apps.dtos.AppDto;
import com.authorizedact.auth_service.features.apps.dtos.AppsSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/apps")
@RequiredArgsConstructor
public class AppsController {

    private final AppsService appsService;

    @GetMapping("/connected")
    public ResponseEntity<List<AppDto>> getConnected(Authentication auth) {
        return ResponseEntity.ok(appsService.getConnectedApps(auth.getName()));
    }

    @GetMapping("/available")
    public ResponseEntity<List<AppDto>> getAvailable(Authentication auth) {
        return ResponseEntity.ok(appsService.getAvailableApps(auth.getName()));
    }

    @GetMapping("/activity")
    public ResponseEntity<List<ActivityLogDto>> getActivity(Authentication auth) {
        return ResponseEntity.ok(appsService.getActivityLog(auth.getName()));
    }

    @GetMapping("/summary")
    public ResponseEntity<AppsSummaryDto> getSummary(Authentication auth) {
        return ResponseEntity.ok(appsService.getSummary(auth.getName()));
    }

    @DeleteMapping("/{provider}/disconnect")
    public ResponseEntity<Void> disconnect(@PathVariable String provider, Authentication auth) {
        appsService.disconnectApp(auth.getName(), provider);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{provider}/renew")
    public ResponseEntity<Void> renew(@PathVariable String provider, Authentication auth) {
        appsService.renewToken(auth.getName(), provider);
        return ResponseEntity.noContent().build();
    }
}
