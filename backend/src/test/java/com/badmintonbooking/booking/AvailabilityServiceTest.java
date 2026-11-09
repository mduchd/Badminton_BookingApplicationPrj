package com.badmintonbooking.booking;

import com.badmintonbooking.booking.dto.CourtAvailabilityResponse;
import com.badmintonbooking.booking.dto.TimeSlotDto;
import com.badmintonbooking.booking.entity.CourtOccupancy;
import com.badmintonbooking.booking.enums.OccupancyType;
import com.badmintonbooking.booking.repository.CourtOccupancyRepository;
import com.badmintonbooking.booking.service.AvailabilityService;
import com.badmintonbooking.court.entity.Court;
import com.badmintonbooking.court.entity.Facility;
import com.badmintonbooking.court.entity.PriceRule;
import com.badmintonbooking.court.repository.CourtRepository;
import com.badmintonbooking.court.repository.FacilityRepository;
import com.badmintonbooking.court.repository.PriceRuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AvailabilityServiceTest {

    @Mock
    private CourtRepository courtRepository;

    @Mock
    private FacilityRepository facilityRepository;

    @Mock
    private PriceRuleRepository priceRuleRepository;

    @Mock
    private CourtOccupancyRepository occupancyRepository;

    @InjectMocks
    private AvailabilityService availabilityService;

    private Court mockCourt;
    private Facility mockFacility;
    private PriceRule defaultPriceRule;

    @BeforeEach
    void setUp() {
        mockCourt = new Court();
        mockCourt.setId(1L);
        mockCourt.setFacilityId(10L);
        mockCourt.setName("Sân 1");

        mockFacility = new Facility();
        mockFacility.setId(10L);
        mockFacility.setName("Cụm Sân Cầu Giấy");
        mockFacility.setOpenTime(LocalTime.of(6, 0));
        mockFacility.setCloseTime(LocalTime.of(8, 0)); // 2 tiếng = 2 slot

        defaultPriceRule = new PriceRule();
        defaultPriceRule.setCourtId(1L);
        defaultPriceRule.setPricePerSlot(new BigDecimal("100000"));
        defaultPriceRule.setStartTime(LocalTime.of(6, 0));
        defaultPriceRule.setEndTime(LocalTime.of(22, 0));
    }

    @Test
    @DisplayName("Availability: kết thúc đúng giờ đóng cửa gần nửa đêm")
    void shouldStopAtLateClosingTime() {
        mockFacility.setOpenTime(LocalTime.of(23, 0));
        mockFacility.setCloseTime(LocalTime.of(23, 59));
        when(courtRepository.findById(1L)).thenReturn(Optional.of(mockCourt));
        when(facilityRepository.findById(10L)).thenReturn(Optional.of(mockFacility));
        when(occupancyRepository.findActiveForCourtInDateRange(eq(1L), any(), any())).thenReturn(List.of());
        when(priceRuleRepository.findRulesForCourtAndDay(eq(1L), anyInt())).thenReturn(List.of(defaultPriceRule));

        var result = assertTimeoutPreemptively(java.time.Duration.ofSeconds(2),
                () -> availabilityService.getCourtAvailability(1L, LocalDate.now().plusDays(1)));
        assertEquals(1, result.slots().size());
        assertEquals(LocalTime.of(23, 59), result.slots().get(0).endTime());
    }

    @Test
    @DisplayName("Availability: Tạo đúng danh sách slot theo khung giờ hoạt động của cơ sở")
    void shouldGenerateSlotsCorrectly() {
        LocalDate date = LocalDate.now().plusDays(1);

        when(courtRepository.findById(1L)).thenReturn(Optional.of(mockCourt));
        when(facilityRepository.findById(10L)).thenReturn(Optional.of(mockFacility));
        when(occupancyRepository.findActiveForCourtInDateRange(eq(1L), any(), any())).thenReturn(List.of());
        when(priceRuleRepository.findRulesForCourtAndDay(eq(1L), anyInt())).thenReturn(List.of(defaultPriceRule));

        CourtAvailabilityResponse res = availabilityService.getCourtAvailability(1L, date);

        assertNotNull(res);
        assertEquals(2, res.slots().size()); // 06:00 - 07:00 và 07:00 - 08:00
        assertTrue(res.slots().get(0).available());
        assertEquals("AVAILABLE", res.slots().get(0).slotStatus());
        assertEquals(0, new BigDecimal("100000").compareTo(res.slots().get(0).price()));
    }

    @Test
    @DisplayName("Availability: Slot trùng với CourtOccupancy phải chuyển sang trạng thái đã chiếm")
    void shouldMarkSlotUnavailableWhenOccupied() {
        LocalDate date = LocalDate.now().plusDays(1);
        OffsetDateTime occStart = date.atTime(6, 0).atZone(AvailabilityService.ZONE_VN).toOffsetDateTime();
        OffsetDateTime occEnd = date.atTime(7, 0).atZone(AvailabilityService.ZONE_VN).toOffsetDateTime();

        CourtOccupancy occupancy = new CourtOccupancy(1L, 99L, occStart, occEnd, OccupancyType.HOLD);

        when(courtRepository.findById(1L)).thenReturn(Optional.of(mockCourt));
        when(facilityRepository.findById(10L)).thenReturn(Optional.of(mockFacility));
        when(occupancyRepository.findActiveForCourtInDateRange(eq(1L), any(), any())).thenReturn(List.of(occupancy));
        when(priceRuleRepository.findRulesForCourtAndDay(eq(1L), anyInt())).thenReturn(List.of(defaultPriceRule));

        CourtAvailabilityResponse res = availabilityService.getCourtAvailability(1L, date);

        assertNotNull(res);
        TimeSlotDto slot1 = res.slots().get(0);
        assertFalse(slot1.available());
        assertEquals("HELD", slot1.slotStatus());

        TimeSlotDto slot2 = res.slots().get(1);
        assertTrue(slot2.available());
    }
}
