package com.badmintonbooking.user.auth.service;

import com.badmintonbooking.security.JwtTokenProvider;
import com.badmintonbooking.user.auth.dto.AuthResponse;
import com.badmintonbooking.user.auth.dto.LoginRequest;
import com.badmintonbooking.user.auth.dto.RegisterRequest;
import com.badmintonbooking.user.auth.dto.UserResponse;
import com.badmintonbooking.user.entity.User;
import com.badmintonbooking.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email().trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Email hoặc mật khẩu không chính xác"));

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Email hoặc mật khẩu không chính xác");
        }

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new IllegalStateException("Tài khoản của bạn đang bị tạm khóa");
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
        return AuthResponse.of(token, UserResponse.fromEntity(user));
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email này đã được sử dụng trong hệ thống");
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName().trim());
        user.setPhone(request.phone() != null ? request.phone().trim() : null);
        if (request.role() == com.badmintonbooking.user.model.UserRole.SYSTEM_ADMIN) {
            throw new IllegalArgumentException("Không thể tự đăng ký quyền quản trị");
        }
        user.setRole(request.role() != null ? request.role().name() : "CUSTOMER");
        user.setProvider("LOCAL");
        user.setStatus("ACTIVE");

        User savedUser = userRepository.save(user);

        String token = jwtTokenProvider.generateToken(savedUser.getId(), savedUser.getEmail(), savedUser.getRole());
        return AuthResponse.of(token, UserResponse.fromEntity(savedUser));
    }

    @Transactional
    public AuthResponse loginWithGoogle(GoogleIdentity identity) {
        User user = userRepository.findByProviderAndProviderSubject("GOOGLE", identity.subject())
                .orElseGet(() -> {
                    String email = identity.email().trim().toLowerCase(java.util.Locale.ROOT);
                    if (userRepository.existsByEmail(email)) {
                        throw new IllegalArgumentException("Email đã có tài khoản. Hãy đăng nhập bằng phương thức đã đăng ký.");
                    }
                    User created = new User();
                    created.setEmail(email);
                    created.setFullName(identity.name());
                    created.setRole("CUSTOMER");
                    created.setProvider("GOOGLE");
                    created.setProviderSubject(identity.subject());
                    created.setStatus("ACTIVE");
                    return userRepository.save(created);
                });
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new IllegalStateException("Tài khoản của bạn đang bị tạm khóa");
        }
        return AuthResponse.of(jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole()), UserResponse.fromEntity(user));
    }

    @Transactional(readOnly = true)
    public UserResponse getProfileByToken(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        if (token == null || !jwtTokenProvider.validateToken(token)) {
            throw new IllegalArgumentException("Token không hợp lệ hoặc đã hết hạn");
        }
        String email = jwtTokenProvider.getEmailFromToken(token);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));
        return UserResponse.fromEntity(user);
    }
}
