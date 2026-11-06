package com.badmintonbooking.court.repository;

import com.badmintonbooking.court.entity.Court;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourtRepository extends JpaRepository<Court, Long> {
    List<Court> findByFacilityIdAndStatus(Long facilityId, String status);
}
