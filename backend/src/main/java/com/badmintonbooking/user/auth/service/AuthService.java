package com.badmintonbooking.user.auth.service;

import com.badmintonbooking.security.JwtTokenProvider;
import com.badmintonbooking.user.auth.dto.AuthResponse;
import com.badmintonbooking.user.auth.dto.LoginRequest;
import com.badmintonbooking.user.auth.dto.PhoneLoginRequest;
import java.util.List;
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

        return authenticate(user, request.password(), "Email hoặc mật khẩu không chính xác");
    }

    @Transactional(readOnly = true)
    public AuthResponse loginByPhone(PhoneLoginRequest request) {
        String national = normalizePhone(request.phone());
        List<User> matches = findPhone(national);
        if (matches.size() != 1) {
            throw new IllegalArgumentException("Số điện thoại hoặc mật khẩu không chính xác");
        }
        return authenticate(matches.get(0), request.password(), "Số điện thoại hoặc mật khẩu không chính xác");
    }

    private List<User> findPhone(String national) {
        String suffix = national.substring(1);
        return userRepository.findByPhoneVariants(national, "84" + suffix, "0084" + suffix);
    }

    public static String normalizePhone(String value) {
        if (value == null || !value.trim().matches("\\+?[0-9][0-9\\s().-]*")) {
            throw new IllegalArgumentException("Số điện thoại không hợp lệ");
        }
        String digits = value.replaceAll("[^0-9]", "");
        if (digits.startsWith("0084")) digits = "0" + digits.substring(4);
        else if (digits.startsWith("84")) digits = "0" + digits.substring(2);
        if (!digits.matches("0[1-9][0-9]{8}")) throw new IllegalArgumentException("Số điện thoại Việt Nam không hợp lệ");
        return digits;
    }

    private AuthResponse authenticate(User user, String password, String errorMessage) {
        if (user.getPasswordHash() == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException(errorMessage);
        }
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new IllegalStateException("Tài khoản của bạn đang bị tạm khóa");
        }
        String token = tokenFor(user);
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
        if (request.phone() != null && !request.phone().isBlank()) {
            String phone = normalizePhone(request.phone());
            if (!findPhone(phone).isEmpty()) throw new IllegalArgumentException("Số điện thoại này đã được sử dụng trong hệ thống");
            user.setPhone(phone);
        }
        if (request.role() == com.badmintonbooking.user.model.UserRole.SYSTEM_ADMIN) {
            throw new IllegalArgumentException("Không thể tự đăng ký quyền quản trị");
        }
        user.setRole(request.role() != null ? request.role().name() : "CUSTOMER");
        user.setProvider("LOCAL");
        user.setStatus("ACTIVE");

        User savedUser = userRepository.save(user);

        String token = tokenFor(savedUser);
        return AuthResponse.of(token, UserResponse.fromEntity(savedUser));
    }

    @Transactional
    public AuthResponse loginWithGoogle(GoogleIdentity identity) {
        User user = userRepository.findByProviderAndProviderSubject("GOOGLE", identity.subject())
                .map(existing -> {
                    if (identity.picture() != null && !identity.picture().isBlank()) {
                        existing.setAvatarUrl(identity.picture());
                    }
                    if ((existing.getFullName() == null || existing.getFullName().isBlank())
                            && identity.name() != null && !identity.name().isBlank()) {
                        existing.setFullName(identity.name());
                    }
                    return existing;
                })
                .orElseGet(() -> {
                    String email = identity.email().trim().toLowerCase(java.util.Locale.ROOT);
                    if (userRepository.existsByEmail(email)) {
                        throw new IllegalArgumentException("Email đã có tài khoản. Hãy đăng nhập bằng phương thức đã đăng ký.");
                    }
                    User created = new User();
                    created.setEmail(email);
                    created.setFullName(identity.name());
                    created.setAvatarUrl(identity.picture());
                    created.setRole("CUSTOMER");
                    created.setProvider("GOOGLE");
                    created.setProviderSubject(identity.subject());
                    created.setStatus("ACTIVE");
                    return userRepository.save(created);
                });
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new IllegalStateException("Tài khoản của bạn đang bị tạm khóa");
        }
        return AuthResponse.of(tokenFor(user), UserResponse.fromEntity(user));
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
                .filter(account -> "ACTIVE".equalsIgnoreCase(account.getStatus()))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng hoặc tài khoản bị khóa"));
        if (user.getTokenVersion() != jwtTokenProvider.getTokenVersion(token)) {
            throw new IllegalArgumentException("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại");
        }
        return UserResponse.fromEntity(user);
    }

    private String tokenFor(User user) {
        return user.getTokenVersion() == 0
                ? jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole())
                : jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole(), user.getTokenVersion());
    }
}
