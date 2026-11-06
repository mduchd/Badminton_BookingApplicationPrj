package com.badmintonbooking.court.repository;

import com.badmintonbooking.court.entity.Facility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FacilityRepository extends JpaRepository<Facility, Long> {
    List<Facility> findByStatus(String status);
    List<Facility> findByDistrictAndStatus(String district, String status);
}
