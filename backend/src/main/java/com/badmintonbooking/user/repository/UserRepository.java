package com.badmintonbooking.user.repository;

import com.badmintonbooking.user.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);

    Optional<User> findByProviderAndProviderSubject(String provider, String providerSubject);
    boolean existsByEmail(String email);

    @Query(value = "SELECT * FROM users WHERE phone ~ '^[+0-9 ().-]+$' AND regexp_replace(phone, '[^0-9]', '', 'g') IN (:national, :international, :idd)", nativeQuery = true)
    List<User> findByPhoneVariants(@Param("national") String national,
                                   @Param("international") String international,
                                   @Param("idd") String idd);
}
