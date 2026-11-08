package com.badmintonbooking.security;
import com.badmintonbooking.user.entity.User;
import com.badmintonbooking.user.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringJUnitConfig(SecurityHttpTest.Config.class) @WebAppConfiguration
class SecurityHttpTest {
 @Configuration @EnableWebMvc @Import(SecurityConfig.class) static class Config {
  @Bean JwtTokenProvider tokens() { return mock(JwtTokenProvider.class); }
  @Bean UserRepository users() { return mock(UserRepository.class); }
  @Bean JwtAuthenticationFilter filter(JwtTokenProvider t, UserRepository u) { return new JwtAuthenticationFilter(t,u); }
  @Bean Probe probe() { return new Probe(); }
 }
 @RestController static class Probe {
  @GetMapping("/api/v1/admin/probe") String admin() { return "admin"; }
  @GetMapping("/api/bookings/probe") String booking() { return "booking"; }
 }
 @Autowired WebApplicationContext context;
 @Autowired JwtTokenProvider tokens;
 @Autowired UserRepository users;
 MockMvc mvc;
 @BeforeEach void setup() {
  reset(tokens,users); mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
  when(tokens.validateToken("valid")).thenReturn(true);
  when(tokens.getEmailFromToken("valid")).thenReturn("user@example.com");
 }
 void account(String role,String state) {
  User user=new User(); user.setEmail("user@example.com"); user.setRole(role); user.setStatus(state);
  when(users.findByEmail("user@example.com")).thenReturn(Optional.of(user));
 }
 @Test void adminRequiresCurrentAdminRole() throws Exception {
  mvc.perform(get("/api/v1/admin/probe")).andExpect(status().isForbidden());
  account("CUSTOMER","ACTIVE"); mvc.perform(get("/api/v1/admin/probe").header("Authorization","Bearer valid")).andExpect(status().isForbidden());
  account("COURT_OWNER","ACTIVE"); mvc.perform(get("/api/v1/admin/probe").header("Authorization","Bearer valid")).andExpect(status().isForbidden());
  account("SYSTEM_ADMIN","ACTIVE"); mvc.perform(get("/api/v1/admin/probe").header("Authorization","Bearer valid")).andExpect(status().isOk());
  account("SYSTEM_ADMIN","LOCKED"); mvc.perform(get("/api/v1/admin/probe").header("Authorization","Bearer valid")).andExpect(status().isForbidden());
 }
 @Test void bookingRequiresActiveUser() throws Exception {
  mvc.perform(get("/api/bookings/probe")).andExpect(status().isForbidden());
  account("CUSTOMER","ACTIVE"); mvc.perform(get("/api/bookings/probe").header("Authorization","Bearer valid")).andExpect(status().isOk());
  account("CUSTOMER","LOCKED"); mvc.perform(get("/api/bookings/probe").header("Authorization","Bearer valid")).andExpect(status().isForbidden());
 }
}
