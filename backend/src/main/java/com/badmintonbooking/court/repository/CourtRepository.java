package com.badmintonbooking.court.repository;

import com.badmintonbooking.court.entity.Court;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface CourtRepository extends JpaRepository<Court, Long> {
    List<Court> findByFacilityIdInAndStatus(Collection<Long> facilityIds, String status);
    List<Court> findByFacilityId(Long facilityId);
    List<Court> findByFacilityIdOrderByCourtNumberAscIdAsc(Long facilityId);
    List<Court> findByFacilityIdInOrderByCourtNumberAscIdAsc(Collection<Long> facilityIds);
}
