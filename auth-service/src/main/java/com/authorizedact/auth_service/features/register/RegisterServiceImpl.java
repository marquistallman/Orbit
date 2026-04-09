package com.authorizedact.auth_service.features.register;

import com.authorizedact.auth_service.domain.entities.User;
import com.authorizedact.auth_service.domain.repositories.UserRepository;
import com.authorizedact.auth_service.features.shared.dtos.AuthResponse;
import com.authorizedact.auth_service.features.shared.dtos.UserDto;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class RegisterServiceImpl implements RegisterService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public RegisterServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public AuthResponse register(RegisterRequest registerRequest) {
        if (userRepository.findByEmail(registerRequest.email()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setEmail(registerRequest.email());
        user.setUsername(registerRequest.username());
        user.setPassword(passwordEncoder.encode(registerRequest.password()));
        user.setActive(true);

        User savedUser = userRepository.save(user);

        UserDto userDto = new UserDto(savedUser.getId(), savedUser.getUsername(), savedUser.getEmail());
        return new AuthResponse(null, userDto);
    }
}