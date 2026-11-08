package com.badmintonbooking.security;

import com.badmintonbooking.user.entity.User;
import com.badmintonbooking.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtAuthenticationFilterTest {
    JwtTokenProvider tokens = mock(JwtTokenProvider.class);
    UserRepository users = mock(UserRepository.class);
    JwtAuthenticationFilter filter = new JwtAuthenticationFilter(tokens, users);
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }
    @Test void usesCurrentDatabaseRoleInsteadOfStaleTokenRole() throws Exception {
        var request = new MockHttpServletRequest(); request.addHeader("Authorization", "Bearer token");
        when(tokens.validateToken("token")).thenReturn(true); when(tokens.getEmailFromToken("token")).thenReturn("a@example.com");
        User user = new User(); user.setEmail("a@example.com"); user.setStatus("ACTIVE"); user.setRole("CUSTOMER");
        when(users.findByEmail("a@example.com")).thenReturn(Optional.of(user));
        filter.doFilter(request, new MockHttpServletResponse(), mock(FilterChain.class));
        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth); assertEquals("ROLE_CUSTOMER", auth.getAuthorities().iterator().next().getAuthority());
        verify(tokens, never()).getRoleFromToken(anyString());
    }
    @Test void blockedAccountIsNotAuthenticated() throws Exception {
        var request = new MockHttpServletRequest(); request.addHeader("Authorization", "Bearer token");
        when(tokens.validateToken("token")).thenReturn(true); when(tokens.getEmailFromToken("token")).thenReturn("a@example.com");
        User user = new User(); user.setStatus("BLOCKED");
        when(users.findByEmail("a@example.com")).thenReturn(Optional.of(user));
        filter.doFilter(request, new MockHttpServletResponse(), mock(FilterChain.class));
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }
}
