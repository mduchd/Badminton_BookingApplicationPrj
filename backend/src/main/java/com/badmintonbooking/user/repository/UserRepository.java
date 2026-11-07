package com.badmintonbooking.user.repository;

import com.badmintonbooking.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByProviderAndProviderSubject(String provider, String providerSubject);
    boolean existsByEmail(String email);
}
