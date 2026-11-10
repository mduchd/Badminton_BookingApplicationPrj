package com.badmintonbooking.user.auth.service;

import com.badmintonbooking.common.exception.BadRequestException;
import com.badmintonbooking.security.CurrentUserService;
import com.badmintonbooking.user.auth.dto.ProfileUpdateRequest;
import com.badmintonbooking.user.auth.dto.UserResponse;
import com.badmintonbooking.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.Principal;
import java.time.OffsetDateTime;

@Service
public class ProfileService {
    private final CurrentUserService currentUser;
    private final UserRepository users;

    public ProfileService(CurrentUserService currentUser, UserRepository users) {
        this.currentUser = currentUser;
        this.users = users;
    }

    @Transactional
    public UserResponse update(Principal principal, ProfileUpdateRequest request) {
        var user = currentUser.requireActiveUser(principal);
        String phone = null;
        if (request.phone() != null && !request.phone().isBlank()) {
            try { phone = AuthService.normalizePhone(request.phone()); }
            catch (IllegalArgumentException ex) { throw new BadRequestException(ex.getMessage()); }
            String suffix = phone.substring(1);
            if (users.findByPhoneVariants(phone, "84" + suffix, "0084" + suffix).stream()
                    .anyMatch(other -> !other.getId().equals(user.getId()))) {
                throw new BadRequestException("Số điện thoại này đã được sử dụng");
            }
        }
        user.setFullName(request.fullName().trim());
        user.setPhone(phone);
        user.setUpdatedAt(OffsetDateTime.now());
        return UserResponse.fromEntity(users.save(user));
    }
}
