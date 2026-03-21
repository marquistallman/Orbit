package com.authorizedact.auth_service.features.Recover;

import com.authorizedact.auth_service.features.Recover.dtos.PasswordRecoverRequest;
import com.authorizedact.auth_service.features.Recover.dtos.PasswordResetRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;

@RestController
@RequestMapping("/api/auth/recover")
@RequiredArgsConstructor
public class RecoverController {

    private final RecoverService recoverService;

    @PostMapping("/request")
    public ResponseEntity<?> requestPasswordReset(@RequestBody PasswordRecoverRequest request) {
        try {
            String token = recoverService.requestPasswordReset(request.getEmail());
            // In a real application, we wouldn't return the token. We'd send an email.
            // For testing, this is fine.
            return ResponseEntity.ok(Collections.singletonMap("message", "Password reset token generated. Check your email (or in this case, the response)."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PostMapping("/reset")
    public ResponseEntity<?> resetPassword(@RequestBody PasswordResetRequest request) {
        try {
            recoverService.resetPassword(request.getToken(), request.getNewPassword());
            return ResponseEntity.ok(Collections.singletonMap("message", "Password has been successfully reset."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}
