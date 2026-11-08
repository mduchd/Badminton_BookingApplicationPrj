package com.badmintonbooking.court.repository;

import com.badmintonbooking.court.entity.Facility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface FacilityRepository extends JpaRepository<Facility, Long>, JpaSpecificationExecutor<Facility> {

    List<Facility> findByStatus(String status);

    List<Facility> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    List<Facility> findAllByOrderByCreatedAtDesc();

    Optional<Facility> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Facility> findByDistrictAndStatus(String district, String status);

    @Query("SELECT f FROM Facility f WHERE f.status = 'ACTIVE' " +
           "AND (:district IS NULL OR LOWER(f.district) LIKE LOWER(CONCAT('%', CAST(:district AS string), '%')) " +
           "     OR LOWER(f.address) LIKE LOWER(CONCAT('%', CAST(:district AS string), '%'))) " +
           "AND (:sportType IS NULL OR LOWER(f.sportType) = LOWER(CAST(:sportType AS string)))")
    List<Facility> searchActiveFacilities(
            @Param("district") String district,
            @Param("sportType") String sportType
    );

    @Query("SELECT DISTINCT f FROM Facility f " +
           "WHERE f.status = 'ACTIVE' AND f.isApproved = true " +
           "AND (:keyword = '' OR LOWER(f.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(f.address) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(COALESCE(f.normalizedAddress, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(COALESCE(f.district, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:city = '' OR LOWER(COALESCE(f.city, '')) LIKE LOWER(CONCAT('%', :city, '%'))) " +
           "AND (:district = '' OR LOWER(COALESCE(f.district, '')) LIKE LOWER(CONCAT('%', :district, '%'))) " +
           "AND (:ward = '' OR LOWER(COALESCE(f.ward, '')) LIKE LOWER(CONCAT('%', :ward, '%'))) " +
           "AND (:sportType = '' OR LOWER(f.sportType) = LOWER(:sportType)) " +
           "AND (:minPrice IS NULL OR f.maxPrice >= :minPrice) " +
           "AND (:maxPrice IS NULL OR f.minPrice <= :maxPrice)")
    List<Facility> filterActiveFacilitiesSql(
            @Param("keyword") String keyword,
            @Param("city") String city,
            @Param("district") String district,
            @Param("ward") String ward,
            @Param("sportType") String sportType,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice
    );

    @Query(value = "SELECT f.id FROM facilities f " +
                   "JOIN facility_amenities fa ON fa.facility_id = f.id " +
                   "WHERE LOWER(fa.amenity) IN (:amenitiesLower) " +
                   "GROUP BY f.id " +
                   "HAVING COUNT(DISTINCT LOWER(fa.amenity)) >= :amenityCount",
           nativeQuery = true)
    List<Long> findFacilityIdsHavingAllAmenities(
            @Param("amenitiesLower") Collection<String> amenitiesLower,
            @Param("amenityCount") long amenityCount
    );

    @Query(value = "SELECT DISTINCT city FROM facilities WHERE status = 'ACTIVE' AND city IS NOT NULL ORDER BY city", nativeQuery = true)
    List<String> findDistinctActiveCities();

    @Query(value = "SELECT DISTINCT district FROM facilities WHERE status = 'ACTIVE' AND district IS NOT NULL ORDER BY district", nativeQuery = true)
    List<String> findDistinctActiveDistricts();

    @Query("SELECT DISTINCT f.district FROM Facility f WHERE f.district IS NOT NULL AND f.district <> '' ORDER BY f.district")
    List<String> findAllDistricts();

    @Query(value = "SELECT DISTINCT amenity FROM facility_amenities ORDER BY amenity", nativeQuery = true)
    List<String> findDistinctAmenities();
}
