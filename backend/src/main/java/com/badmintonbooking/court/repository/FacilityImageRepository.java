package com.badmintonbooking.court.repository;

import com.badmintonbooking.court.entity.FacilityImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface FacilityImageRepository extends JpaRepository<FacilityImage, Long> {
    List<FacilityImage> findByFacilityIdOrderBySortOrderAscIdAsc(Long facilityId);
    List<FacilityImage> findByFacilityIdInOrderBySortOrderAscIdAsc(Collection<Long> facilityIds);
    void deleteByFacilityId(Long facilityId);
}
