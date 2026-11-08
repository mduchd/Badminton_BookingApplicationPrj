package com.badmintonbooking.court;

import com.badmintonbooking.booking.entity.Booking;
import com.badmintonbooking.booking.entity.CourtOccupancy;
import com.badmintonbooking.booking.enums.ActiveStatus;
import com.badmintonbooking.booking.enums.BookingStatus;
import com.badmintonbooking.booking.enums.OccupancyType;
import com.badmintonbooking.booking.repository.BookingRepository;
import com.badmintonbooking.booking.repository.CourtOccupancyRepository;
import com.badmintonbooking.common.exception.BadRequestException;
import com.badmintonbooking.common.exception.ForbiddenException;
import com.badmintonbooking.common.exception.SlotConflictException;
import com.badmintonbooking.court.dto.*;
import com.badmintonbooking.court.entity.Court;
import com.badmintonbooking.court.entity.Facility;
import com.badmintonbooking.court.entity.PriceRule;
import com.badmintonbooking.court.repository.CourtRepository;
import com.badmintonbooking.court.repository.FacilityImageRepository;
import com.badmintonbooking.court.repository.FacilityRepository;
import com.badmintonbooking.court.repository.PriceRuleRepository;
import com.badmintonbooking.court.service.AddressNormalizerService;
import com.badmintonbooking.court.service.FacilityQueryService;
import com.badmintonbooking.court.service.OwnerCourtManagementService;
import com.badmintonbooking.security.OwnerAuthorizationService;
import com.badmintonbooking.user.entity.User;
import com.badmintonbooking.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class Tv2CourtManagementServiceTest {

    private AddressNormalizerService addressNormalizerService;

    @Mock private FacilityRepository facilityRepository;
    @Mock private CourtRepository courtRepository;
    @Mock private PriceRuleRepository priceRuleRepository;
    @Mock private FacilityImageRepository facilityImageRepository;
    @Mock private BookingRepository bookingRepository;
    @Mock private CourtOccupancyRepository occupancyRepository;
    @Mock private UserRepository userRepository;
    @Mock private OwnerAuthorizationService ownerAuthService;

    private FacilityQueryService facilityQueryService;
    private OwnerCourtManagementService ownerService;

    @BeforeEach
    void setUp() {
        addressNormalizerService = new AddressNormalizerService();
        facilityQueryService = new FacilityQueryService(
                facilityRepository,
                courtRepository,
                priceRuleRepository,
                facilityImageRepository,
                occupancyRepository,
                addressNormalizerService
        );
        ownerService = new OwnerCourtManagementService(
                facilityRepository,
                courtRepository,
                priceRuleRepository,
                facilityImageRepository,
                bookingRepository,
                occupancyRepository,
                userRepository,
                addressNormalizerService,
                facilityQueryService,
                ownerAuthService
        );
    }

    @Test
    void normalizeAddress_shouldStandardizeComponentsAndBuildMapsEmbedUrl() {
        var result = addressNormalizerService.normalize(
                "Hà Nội",
                "Cầu Giấy",
                "Dịch Vọng Hậu",
                "Số 35 Trần Thái Tông",
                null,
                null,
                null
        );

        assertEquals("Số 35 Trần Thái Tông, Phường Dịch Vọng Hậu, Quận Cầu Giấy, TP. Hà Nội", result.normalizedAddress());
        assertEquals(21.0313, result.latitude(), 0.001);
        assertEquals(105.7831, result.longitude(), 0.001);
        assertTrue(result.mapsEmbedUrl().contains("maps.google.com/maps?q=21.031300,105.783100"));
        assertTrue(result.mapsEmbedUrl().endsWith("output=embed"));
        assertEquals("clb-cau-long-phuc-long", addressNormalizerService.toSlug("CLB Cầu Lông Phúc Long"));
    }

    @Test
    void normalizeAddress_shouldRejectInvalidCoordinates() {
        assertThrows(BadRequestException.class, () -> addressNormalizerService.normalize(
                "Hà Nội", "Đống Đa", "Văn Chương", "460 Trần Quý Cáp", null, 125.0, 105.8
        ));
    }

    @Test
    void searchFacilities_shouldFilterBySqlAmenitiesAndSortByPriceAsc() {
        Facility f1 = new Facility();
        f1.setId(1L);
        f1.setName("CLB Cầu Lông Phúc Long");
        f1.setCity("Hà Nội");
        f1.setDistrict("Đống Đa");
        f1.setNormalizedAddress("460 Trần Quý Cáp, Phường Văn Chương, Quận Đống Đa, TP. Hà Nội");
        f1.setLatitude(21.0221);
        f1.setLongitude(105.8347);
        f1.setOpenTime(LocalTime.of(5, 30));
        f1.setCloseTime(LocalTime.of(23, 0));
        f1.setMinPrice(BigDecimal.valueOf(120000));
        f1.setRating(BigDecimal.valueOf(4.9));

        Facility f2 = new Facility();
        f2.setId(2L);
        f2.setName("CLB Cầu Giấy Star Arena");
        f2.setCity("Hà Nội");
        f2.setDistrict("Cầu Giấy");
        f2.setNormalizedAddress("35 Trần Thái Tông, Phường Dịch Vọng Hậu, Quận Cầu Giấy, TP. Hà Nội");
        f2.setLatitude(21.0313);
        f2.setLongitude(105.7831);
        f2.setOpenTime(LocalTime.of(5, 30));
        f2.setCloseTime(LocalTime.of(23, 0));
        f2.setMinPrice(BigDecimal.valueOf(90000));
        f2.setRating(BigDecimal.valueOf(4.7));

        when(facilityRepository.filterActiveFacilitiesSql(anyString(), anyString(), anyString(), anyString(), anyString(), any(), any()))
                .thenReturn(List.of(f1, f2));
        when(facilityRepository.findFacilityIdsHavingAllAmenities(eq(Set.of("máy lạnh", "bãi đỗ ô tô")), eq(2L)))
                .thenReturn(List.of(1L, 2L));
        when(courtRepository.findByFacilityIdInOrderByCourtNumberAscIdAsc(anyList())).thenReturn(List.of());
        when(facilityImageRepository.findByFacilityIdInOrderBySortOrderAscIdAsc(anyList())).thenReturn(List.of());

        List<FacilitySummaryDto> results = facilityQueryService.searchFacilities(
                "", "Hà Nội", "", "", "badminton",
                List.of("Máy lạnh", "Bãi đỗ ô tô"),
                BigDecimal.valueOf(80000), BigDecimal.valueOf(150000),
                null, null, null, "price_asc"
        );

        assertEquals(2, results.size());
        assertEquals(2L, results.getFirst().id());
        assertEquals(1L, results.get(1).id());
    }

    @Test
    void updateFacility_shouldThrowForbiddenWhenOwnerDoesNotOwnFacility() {
        User otherOwner = new User();
        otherOwner.setId(99L);
        otherOwner.setRole("COURT_OWNER");

        Facility existing = new Facility();
        existing.setId(1L);
        existing.setOwnerId(2L);

        when(ownerAuthService.requireCurrentOwnerOrAdmin()).thenReturn(otherOwner);
        when(facilityRepository.findById(1L)).thenReturn(Optional.of(existing));
        doThrow(new ForbiddenException("Bạn không có quyền thao tác trên cụm sân không thuộc quyền sở hữu của mình."))
                .when(ownerAuthService).assertCanManageFacility(existing, otherOwner);

        FacilityUpsertRequest req = new FacilityUpsertRequest(
                "Tên mới", "Hà Nội", "Đống Đa", "Văn Chương", "460 Trần Quý Cáp",
                null, 21.0221, 105.8347, LocalTime.of(6, 0), LocalTime.of(22, 0),
                "0912345678", null, null, null, null, List.of(), List.of(), "badminton", "ACTIVE", List.of()
        );

        assertThrows(ForbiddenException.class, () -> ownerService.updateFacility(1L, req));
    }

    @Test
    void createMaintenanceBlock_shouldRejectWhenOverlappingBookingExists() {
        User owner = new User();
        owner.setId(2L);
        owner.setRole("COURT_OWNER");

        Facility facility = new Facility();
        facility.setId(1L);
        facility.setOwnerId(2L);

        Court court = new Court();
        court.setId(10L);
        court.setFacilityId(1L);
        court.setName("Sân 1 (VIP)");

        CourtOccupancy activeBookingOcc = new CourtOccupancy(
                10L, 500L, OffsetDateTime.now(), OffsetDateTime.now().plusHours(2), OccupancyType.BOOKING
        );

        when(ownerAuthService.requireCurrentOwnerOrAdmin()).thenReturn(owner);
        when(facilityRepository.findById(1L)).thenReturn(Optional.of(facility));
        when(courtRepository.findById(10L)).thenReturn(Optional.of(court));
        when(occupancyRepository.findActiveOverlapping(eq(10L), any(), any()))
                .thenReturn(List.of(activeBookingOcc));

        MaintenanceCreateRequest req = new MaintenanceCreateRequest(
                10L, false, LocalDate.now().plusDays(1),
                LocalTime.of(18, 0), LocalTime.of(20, 0), "Thay đèn LED"
        );

        assertThrows(SlotConflictException.class, () -> ownerService.createMaintenanceBlock(1L, req));
    }

    @Test
    void createPriceRule_shouldSupportFixedMonthlyAndCasualPricing() {
        User owner = new User();
        owner.setId(2L);
        owner.setRole("COURT_OWNER");

        Facility facility = new Facility();
        facility.setId(1L);
        facility.setOwnerId(2L);

        when(ownerAuthService.requireCurrentOwnerOrAdmin()).thenReturn(owner);
        when(facilityRepository.findById(1L)).thenReturn(Optional.of(facility));
        when(courtRepository.findByFacilityIdOrderByCourtNumberAscIdAsc(1L)).thenReturn(List.of());
        when(priceRuleRepository.findAllByFacility(1L)).thenReturn(List.of());
        when(priceRuleRepository.save(any(PriceRule.class))).thenAnswer(inv -> {
            PriceRule saved = inv.getArgument(0);
            saved.setId(77L);
            return saved;
        });

        PriceRuleUpsertRequest req = new PriceRuleUpsertRequest(
                null,
                "Hợp đồng cố định tháng khung tối",
                null,
                "WEEKDAY",
                "FIXED_MONTHLY",
                LocalTime.of(18, 0),
                LocalTime.of(21, 0),
                BigDecimal.valueOf(120000),
                60,
                null,
                null
        );

        PriceRuleDto dto = ownerService.createPriceRule(1L, req);
        assertEquals(77L, dto.id());
        assertEquals("FIXED_MONTHLY", dto.customerType());
        assertEquals("WEEKDAY", dto.dayType());
        assertEquals(0, BigDecimal.valueOf(120000).compareTo(dto.pricePerHour()));
    }

    @ParameterizedTest
    @EnumSource(value = BookingStatus.class, names = {"CANCELLED", "EXPIRED"})
    void confirmBooking_shouldRejectTerminalStatus(BookingStatus status) {
        Booking booking = managedBooking(status);

        assertThrows(BadRequestException.class, () -> ownerService.updateOwnerBookingStatus(booking.getId(), "CONFIRMED"));
        assertEquals(status, booking.getStatus());
        verifyNoInteractions(occupancyRepository);
    }

    @Test
    void confirmBooking_shouldRejectExpiredHoldBeforeSchedulerRuns() {
        Booking booking = managedBooking(BookingStatus.HELD);
        booking.setHoldExpiresAt(OffsetDateTime.now().minusSeconds(1));

        assertThrows(SlotConflictException.class, () -> ownerService.updateOwnerBookingStatus(booking.getId(), "CONFIRMED"));
        assertEquals(BookingStatus.HELD, booking.getStatus());
    }

    @Test
    void confirmBooking_shouldRejectReleasedOccupancy() {
        Booking booking = managedBooking(BookingStatus.HELD);
        CourtOccupancy occupancy = new CourtOccupancy();
        occupancy.setActiveStatus(ActiveStatus.RELEASED);
        when(occupancyRepository.findByBookingId(booking.getId())).thenReturn(List.of(occupancy));

        assertThrows(SlotConflictException.class, () -> ownerService.updateOwnerBookingStatus(booking.getId(), "CONFIRMED"));
        assertEquals(BookingStatus.HELD, booking.getStatus());
        assertEquals(ActiveStatus.RELEASED, occupancy.getActiveStatus());
    }

    @Test
    void confirmBooking_shouldConvertActiveHoldAndAllowRetry() {
        Booking booking = managedBooking(BookingStatus.HELD);
        CourtOccupancy occupancy = new CourtOccupancy();
        when(occupancyRepository.findByBookingId(booking.getId())).thenReturn(List.of(occupancy));

        assertEquals("CONFIRMED", ownerService.updateOwnerBookingStatus(booking.getId(), "CONFIRMED").status());
        assertEquals("CONFIRMED", ownerService.updateOwnerBookingStatus(booking.getId(), "CONFIRMED").status());
        assertEquals(OccupancyType.BOOKING, occupancy.getOccupancyType());
        assertEquals(ActiveStatus.ACTIVE, occupancy.getActiveStatus());
    }

    private Booking managedBooking(BookingStatus status) {
        User owner = new User();
        owner.setId(2L);

        Facility facility = new Facility();
        facility.setId(1L);
        facility.setOwnerId(owner.getId());

        Booking booking = new Booking();
        booking.setId(500L);
        booking.setFacilityId(facility.getId());
        booking.setCourtId(10L);
        booking.setCustomerId(3L);
        booking.setStatus(status);
        booking.setHoldExpiresAt(OffsetDateTime.now().plusMinutes(5));

        when(ownerAuthService.requireCurrentOwnerOrAdmin()).thenReturn(owner);
        when(bookingRepository.findByIdForUpdate(booking.getId())).thenReturn(Optional.of(booking));
        when(facilityRepository.findById(facility.getId())).thenReturn(Optional.of(facility));
        return booking;
    }
}
