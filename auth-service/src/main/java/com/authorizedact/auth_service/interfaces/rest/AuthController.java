package com.authorizedact.auth_service.interfaces.rest;

import com.authorizedact.auth_service.application.dtos.AuthResponse;
import com.authorizedact.auth_service.application.dtos.LoginRequest;
import com.authorizedact.auth_service.application.dtos.RegisterRequest;
import com.authorizedact.auth_service.application.services.AuthService;
import com.authorizedact.auth_service.domain.entities.User;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*") // Permite peticiones de cualquier origen (ajustar para producción)
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest registerRequest) {
        AuthResponse response = authService.register(registerRequest);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest loginRequest) {
        AuthResponse response = authService.login(loginRequest);
        return ResponseEntity.ok(response);
    }
}
