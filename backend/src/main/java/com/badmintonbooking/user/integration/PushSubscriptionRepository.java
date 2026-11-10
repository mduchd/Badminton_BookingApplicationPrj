package com.badmintonbooking.user.integration;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PushSubscriptionRepository extends JpaRepository<PushSubscription,String> {
    List<PushSubscription> findByUserId(Long userId);
    void deleteByUserId(Long userId);
    boolean existsByUserId(Long userId);
}
