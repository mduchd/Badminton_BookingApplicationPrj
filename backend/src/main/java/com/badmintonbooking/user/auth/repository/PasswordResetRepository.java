package com.badmintonbooking.user.auth.repository;

import com.badmintonbooking.user.auth.entity.PasswordResetToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface PasswordResetRepository extends JpaRepository<PasswordResetToken, String> {
    @Query("SELECT t.userId FROM PasswordResetToken t WHERE t.hash = :hash")
    Optional<Long> findUserIdByHash(@Param("hash") String hash);
    Optional<PasswordResetToken> findFirstByUserIdOrderByCreatedAtDesc(Long userId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM PasswordResetToken t WHERE t.hash = :hash")
    Optional<PasswordResetToken> lockByHash(@Param("hash") String hash);
    @Modifying @Query("UPDATE PasswordResetToken t SET t.used = true WHERE t.userId = :userId")
    void invalidateAll(@Param("userId") Long userId);
}
