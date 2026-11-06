package com.badmintonbooking.court.repository;

import com.badmintonbooking.court.entity.PriceRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PriceRuleRepository extends JpaRepository<PriceRule, Long> {

    @Query("SELECT p FROM PriceRule p WHERE p.courtId = :courtId " +
           "AND (p.dayOfWeek = :dayOfWeek OR p.dayOfWeek = 0) " +
           "ORDER BY p.startTime ASC")
    List<PriceRule> findRulesForCourtAndDay(@Param("courtId") Long courtId, @Param("dayOfWeek") int dayOfWeek);
}
