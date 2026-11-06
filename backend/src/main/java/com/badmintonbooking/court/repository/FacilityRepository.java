package com.badmintonbooking.court.repository;

import com.badmintonbooking.court.model.Facility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FacilityRepository extends JpaRepository<Facility, UUID> {

    List<Facility> findByStatus(String status);

    @Query("SELECT f FROM Facility f WHERE f.status = 'ACTIVE' " +
           "AND (:district IS NULL OR LOWER(f.district) LIKE LOWER(CONCAT('%', :district, '%')) OR LOWER(f.address) LIKE LOWER(CONCAT('%', :district, '%'))) " +
           "AND (:sportType IS NULL OR LOWER(f.sportType) = LOWER(:sportType))")
    List<Facility> searchActiveFacilities(
            @Param("district") String district,
            @Param("sportType") String sportType
    );
}
