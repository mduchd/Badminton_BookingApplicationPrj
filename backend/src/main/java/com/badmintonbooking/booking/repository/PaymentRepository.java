package com.badmintonbooking.booking.repository;

import com.badmintonbooking.booking.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByBookingId(Long bookingId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Payment> findByProviderOrderCode(Long providerOrderCode);
}
