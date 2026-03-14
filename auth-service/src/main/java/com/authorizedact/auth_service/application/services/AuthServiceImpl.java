package com.authorizedact.auth_service.application.services;

import com.authorizedact.auth_service.application.dtos.AuthResponse;
import com.authorizedact.auth_service.application.dtos.LoginRequest;
import com.authorizedact.auth_service.application.dtos.RegisterRequest;
import com.authorizedact.auth_service.application.dtos.UserDto;
import com.authorizedact.auth_service.domain.entities.User;
import com.authorizedact.auth_service.domain.repositories.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public AuthResponse register(RegisterRequest registerRequest) {
        // DEBUG: Verificar qué llega exactamente
        System.out.println("Registro solicitado para: " + registerRequest.getEmail() + " / " + registerRequest.getUsername());

        if (userRepository.findByEmail(registerRequest.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setEmail(registerRequest.getEmail());
        user.setUsername(registerRequest.getUsername());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.setActive(true);

        User savedUser = userRepository.save(user);
        System.out.println("Usuario guardado con ID: " + savedUser.getId());

        // TODO: Generar un JWT real aquí.
        String token = "mock-jwt-token-" + savedUser.getId();

        UserDto userDto = new UserDto(savedUser.getId(), savedUser.getUsername(), savedUser.getEmail());
        return new AuthResponse(token, userDto);
    }

    @Override
    public AuthResponse login(LoginRequest loginRequest) {
        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        // TODO: Generar un JWT real aquí.
        String token = "mock-jwt-token-" + user.getId();
        
        UserDto userDto = new UserDto(user.getId(), user.getUsername(), user.getEmail());
        return new AuthResponse(token, userDto);
    }
}
