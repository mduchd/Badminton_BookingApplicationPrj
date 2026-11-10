package com.badmintonbooking.user.integration;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface CalendarConsentRepository extends JpaRepository<CalendarConsent,String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("SELECT c FROM CalendarConsent c WHERE c.hash=:hash")
    Optional<CalendarConsent> lockByHash(@Param("hash") String hash);
    void deleteByUserId(Long userId);
}
