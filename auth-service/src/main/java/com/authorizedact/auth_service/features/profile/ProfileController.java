package com.authorizedact.auth_service.features.profile;

import com.authorizedact.auth_service.features.profile.dtos.ProfileResponse;
import com.authorizedact.auth_service.features.profile.dtos.UpdateProfileRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping("/me")
    public ResponseEntity<ProfileResponse> getMyProfile(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(profileService.getUserProfile(authentication.getName()));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(Authentication authentication,
                                           @RequestBody UpdateProfileRequest request) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        try {
            ProfileResponse updated = profileService.updateProfile(authentication.getName(), request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        profileService.deleteAccount(authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
