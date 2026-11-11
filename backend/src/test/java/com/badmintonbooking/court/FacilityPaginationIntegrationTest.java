package com.badmintonbooking.court;

import com.badmintonbooking.admin.service.AdminService;
import com.badmintonbooking.court.entity.Facility;
import com.badmintonbooking.court.repository.FacilityRepository;
import com.badmintonbooking.court.service.FacilityQueryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.math.BigDecimal;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:pagination;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Transactional
class FacilityPaginationIntegrationTest {
    @Autowired FacilityRepository repository;
    @Autowired FacilityQueryService publicService;
    @Autowired AdminService adminService;
    @Autowired WebApplicationContext context;

    @Test
    void filtersBeforePagingAndPreservesStableOrder() throws Exception {
        for (int i = 0; i < 25; i++) {
            Facility facility = new Facility();
            facility.setStatus("ACTIVE");
            facility.setIsApproved(true);
            facility.setName("Pagination " + i);
            facility.setAddress("Test address");
            facility.setDistrict(i < 13 ? "Quan A" : "Quan B");
            facility.setRating(new BigDecimal("4.90"));
            facility.setAmenitySet(i < 13 ? Set.of("Wifi") : Set.of("Parking"));
            repository.save(facility);
        }
        repository.flush();
        var first = publicService.searchFacilitiesPage("Pagination", "Quan A", null, java.util.List.of("wifi"), null, null, 0, 10);
        var second = publicService.searchFacilitiesPage("Pagination", "Quan A", null, java.util.List.of("wifi"), null, null, 1, 10);
        assertEquals(13, first.getTotalElements());
        assertEquals(10, first.getNumberOfElements());
        assertEquals(3, second.getNumberOfElements());
        assertTrue(first.getContent().stream().noneMatch(a -> second.getContent().stream().anyMatch(b -> a.id().equals(b.id()))));
        var admin = adminService.getFacilitiesPage("Pagination", "ACTIVE", "Quan B", 0, 5);
        assertEquals(12, admin.getTotalElements());
        assertEquals(5, admin.getNumberOfElements());
        assertTrue(admin.getContent().stream().allMatch(f -> "Quan B".equals(f.district())));
        var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        mvc.perform(get("/api/facilities/page").param("keyword", "Pagination").param("amenities", "wifi").param("size", "10").param("page", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(13))
                .andExpect(jsonPath("$.content.length()").value(3))
                .andExpect(jsonPath("$.content[0].minPrice").value(80000))
                .andExpect(jsonPath("$.content[0].courts").doesNotExist())
                .andExpect(jsonPath("$.content[0].galleryImages").doesNotExist());
        mvc.perform(get("/api/v1/admin/facilities/page").with(user("admin").roles("SYSTEM_ADMIN"))
                        .param("search", "Pagination").param("district", "Quan B").param("size", "5"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(12))
                .andExpect(jsonPath("$.data.content.length()").value(5));
    }
}
