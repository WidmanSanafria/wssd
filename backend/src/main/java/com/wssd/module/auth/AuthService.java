package com.wssd.module.auth;

import com.wssd.module.auth.dto.LoginRequest;
import com.wssd.module.auth.dto.RegisterRequest;
import com.wssd.module.auth.dto.TokenResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository  userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService      jwtService;

    @Transactional
    public TokenResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new ResponseStatusException(CONFLICT, "El email ya está registrado");
        }
        User user = User.builder()
            .email(req.email())
            .passwordHash(passwordEncoder.encode(req.password()))
            .displayName(req.displayName())
            .build();
        userRepository.save(user);
        return buildTokenResponse(user);
    }

    public TokenResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
            .orElseThrow(() -> new BadCredentialsException("Credenciales inválidas"));
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Credenciales inválidas");
        }
        return buildTokenResponse(user);
    }

    public TokenResponse refresh(String refreshToken) {
        try {
            String email = jwtService.extractUsername(refreshToken);
            User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Usuario no encontrado"));
            if (jwtService.isTokenExpired(refreshToken)) {
                throw new ResponseStatusException(UNAUTHORIZED, "Refresh token expirado");
            }
            return buildTokenResponse(user);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(UNAUTHORIZED, "Refresh token inválido");
        }
    }

    public TokenResponse issueTokens(User user) {
        return buildTokenResponse(user);
    }

    private TokenResponse buildTokenResponse(User user) {
        return TokenResponse.builder()
            .accessToken(jwtService.generateToken(user))
            .refreshToken(jwtService.generateRefreshToken(user))
            .expiresIn(jwtService.getExpirationMs() / 1000)
            .user(TokenResponse.UserDto.builder()
                .id(user.getId().toString())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .plan(user.getPlan())
                .build())
            .build();
    }
}
