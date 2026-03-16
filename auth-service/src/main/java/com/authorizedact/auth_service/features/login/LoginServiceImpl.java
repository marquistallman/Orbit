package com.authorizedact.auth_service.features.login;

import com.authorizedact.auth_service.domain.entities.User;
import com.authorizedact.auth_service.domain.repositories.UserRepository;
import com.authorizedact.auth_service.features.shared.dtos.AuthResponse;
import com.authorizedact.auth_service.features.shared.dtos.UserDto;
import com.authorizedact.auth_service.infrastructure.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class LoginServiceImpl implements LoginService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public LoginServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Override
    public AuthResponse login(LoginRequest loginRequest) {
        User user = userRepository.findByEmail(loginRequest.email())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(loginRequest.password(), user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        String token = jwtService.generateToken(user);
        UserDto userDto = new UserDto(user.getId(), user.getUsername(), user.getEmail());
        return new AuthResponse(token, userDto);
    }
}