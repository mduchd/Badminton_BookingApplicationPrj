package com.badmintonbooking.security;

import com.badmintonbooking.common.exception.UnauthorizedException;
import com.badmintonbooking.user.entity.User;
import com.badmintonbooking.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.security.Principal;

@Service
public class CurrentUserService {

    private final UserRepository users;

    public CurrentUserService(UserRepository users) {
        this.users = users;
    }

    public User requireActiveUser(Principal principal) {
        if (principal == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để tiếp tục.");
        }
        return users.findByEmail(principal.getName())
                .filter(user -> "ACTIVE".equals(user.getStatus()))
                .orElseThrow(() -> new UnauthorizedException("Tài khoản không còn hoạt động."));
    }
}
