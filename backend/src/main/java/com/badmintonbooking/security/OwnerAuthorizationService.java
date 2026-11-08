package com.badmintonbooking.security;

import com.badmintonbooking.common.exception.ForbiddenException;
import com.badmintonbooking.common.exception.UnauthorizedException;
import com.badmintonbooking.court.entity.Facility;
import com.badmintonbooking.user.entity.User;
import com.badmintonbooking.user.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class OwnerAuthorizationService {

    private final UserRepository userRepository;

    public OwnerAuthorizationService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User requireCurrentOwnerOrAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null
                || "anonymousUser".equals(auth.getPrincipal())) {
            throw new UnauthorizedException("Vui lòng đăng nhập tài khoản Chủ sân (COURT_OWNER) để thao tác.");
        }

        String email = auth.getName();
        User user = userRepository.findByEmail(email)
                .filter(item -> "ACTIVE".equalsIgnoreCase(item.getStatus()))
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy tài khoản người dùng đang đăng nhập."));

        if (!isOwnerOrAdmin(user)) {
            throw new ForbiddenException("Tài khoản của bạn không có quyền Chủ sân (COURT_OWNER).");
        }

        return user;
    }

    public void assertCanManageFacility(Facility facility, User actor) {
        if (isAdmin(actor)) {
            return;
        }
        if (!actor.getId().equals(facility.getOwnerId())) {
            throw new ForbiddenException("Bạn không có quyền chỉnh sửa cụm sân thuộc chủ sở hữu khác.");
        }
    }

    public boolean isAdmin(User user) {
        if (user == null || user.getRole() == null) return false;
        String r = user.getRole().toUpperCase();
        return "SYSTEM_ADMIN".equals(r) || "ADMIN".equals(r);
    }

    public boolean isOwnerOrAdmin(User user) {
        if (user == null || user.getRole() == null) return false;
        String r = user.getRole().toUpperCase();
        return "COURT_OWNER".equals(r) || "OWNER".equals(r) || isAdmin(user);
    }
}
