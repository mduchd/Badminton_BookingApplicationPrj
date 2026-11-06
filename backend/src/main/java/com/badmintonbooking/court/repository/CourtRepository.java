package com.badmintonbooking.court.repository;

import com.badmintonbooking.court.model.Court;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CourtRepository extends JpaRepository<Court, UUID> {
    List<Court> findByFacilityIdAndStatus(UUID facilityId, String status);
    List<Court> findByFacilityId(UUID facilityId);
}
