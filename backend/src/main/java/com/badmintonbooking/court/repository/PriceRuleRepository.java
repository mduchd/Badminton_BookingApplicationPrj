package com.badmintonbooking.court.repository;

import com.badmintonbooking.court.entity.PriceRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PriceRuleRepository extends JpaRepository<PriceRule, Long> {

    List<PriceRule> findByCourtIdIn(List<Long> courtIds);

    @Query("SELECT p FROM PriceRule p WHERE " +
           "(p.courtId = :courtId OR (p.courtId IS NULL AND p.facilityId = (SELECT c.facilityId FROM Court c WHERE c.id = :courtId))) " +
           "AND p.customerType = 'CASUAL' " +
           "AND (p.dayOfWeek = :dayOfWeek " +
           "     OR (p.dayOfWeek = 0 AND p.dayType = 'ALL') " +
           "     OR (p.dayType = 'WEEKDAY' AND :dayOfWeek BETWEEN 1 AND 5) " +
           "     OR (p.dayType = 'WEEKEND' AND :dayOfWeek IN (6, 7))) " +
           "ORDER BY CASE WHEN p.courtId IS NOT NULL THEN 0 ELSE 1 END, " +
           "         CASE WHEN p.dayOfWeek > 0 THEN 0 WHEN p.dayType IN ('WEEKDAY', 'WEEKEND') THEN 1 ELSE 2 END, " +
           "         p.startTime ASC")
    List<PriceRule> findRulesForCourtAndDay(@Param("courtId") Long courtId, @Param("dayOfWeek") int dayOfWeek);

    @Query("SELECT p FROM PriceRule p WHERE " +
           "p.facilityId = :facilityId OR p.courtId IN (SELECT c.id FROM Court c WHERE c.facilityId = :facilityId) " +
           "ORDER BY p.customerType ASC, p.startTime ASC, p.id ASC")
    List<PriceRule> findAllByFacility(@Param("facilityId") Long facilityId);
}
