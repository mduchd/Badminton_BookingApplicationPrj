package com.badmintonbooking.court;

import com.badmintonbooking.booking.entity.*;
import com.badmintonbooking.booking.enums.*;
import com.badmintonbooking.booking.repository.*;
import com.badmintonbooking.court.entity.*;
import com.badmintonbooking.court.repository.*;
import com.badmintonbooking.security.JwtTokenProvider;
import com.badmintonbooking.user.entity.User;
import com.badmintonbooking.user.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

/** Regression contracts for the three-role CRUD audit; all rows are isolated fixtures. */
@SpringBootTest(properties={
 "spring.datasource.url=jdbc:h2:mem:crud-roles;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
 "spring.datasource.driver-class-name=org.h2.Driver","spring.datasource.username=sa","spring.datasource.password=",
 "spring.flyway.enabled=false","spring.jpa.hibernate.ddl-auto=create-drop","ai.enabled=false",
 "app.integrations.initial-delay-ms=3600000"
})
class CrudRolesIntegrationTest {
 @Autowired WebApplicationContext context;
 @Autowired UserRepository users;
 @Autowired FacilityRepository facilities;
 @Autowired CourtRepository courts;
 @Autowired PriceRuleRepository prices;
 @Autowired BookingRepository bookings;
 @Autowired PaymentRepository payments;
 @Autowired JwtTokenProvider jwt;
 MockMvc mvc;
 User owner,otherOwner,admin,customer;
 @BeforeEach void setup(){
  mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
  owner=user("COURT_OWNER");otherOwner=user("COURT_OWNER");admin=user("SYSTEM_ADMIN");customer=user("CUSTOMER");
 }
 User user(String role){User u=new User();u.setEmail(UUID.randomUUID()+"@crud-regression.invalid");u.setFullName("Regression "+role);u.setRole(role);return users.saveAndFlush(u);}
 String auth(User u){return "Bearer "+jwt.generateToken(u.getId(),u.getEmail(),u.getRole(),u.getTokenVersion());}
 String body(String status){return "{\"name\":\"Regression "+UUID.randomUUID()+"\",\"city\":\"Hà Nội\",\"district\":\"Cầu Giấy\",\"streetAddress\":\"123 Test\",\"phone\":\"0901234567\",\"openTime\":\"06:00\",\"closeTime\":\"23:00\""+(status==null?"":",\"status\":\""+status+"\"")+"}";}
 Facility facility(String status,boolean approved){Facility f=new Facility();f.setName("Regression "+UUID.randomUUID());f.setAddress("Isolated");f.setOwnerId(owner.getId());f.setStatus(status);f.setIsApproved(approved);return facilities.saveAndFlush(f);}
 Court court(Facility f){Court c=new Court();c.setFacilityId(f.getId());c.setName("Regression court");return courts.saveAndFlush(c);}
 Booking booking(Facility f,Court c,LocalDate date,BookingStatus status){
  Booking b=new Booking();b.setCustomerId(customer.getId());b.setFacilityId(f.getId());b.setCourtId(c.getId());
  b.setBookingDate(date);b.setStartTime(LocalTime.of(18,0));b.setEndTime(LocalTime.of(19,0));b.setTotalAmount(BigDecimal.valueOf(110000));b.setStatus(status);return bookings.saveAndFlush(b);
 }

 @Test void ownerCreationRequiresApproval() throws Exception {
  mvc.perform(post("/api/owner/facilities").header("Authorization",auth(owner)).contentType("application/json").content(body("ACTIVE")))
   .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDING_APPROVAL")).andExpect(jsonPath("$.isApproved").value(false));
 }
 @ParameterizedTest @ValueSource(strings={"PAUSED","SUSPENDED","REJECTED","PENDING_APPROVAL"})
 void ownerCannotDirectlyResumeAdminRestriction(String state) throws Exception {
  Facility f=facility(state,!state.equals("REJECTED")&&!state.equals("PENDING_APPROVAL"));
  mvc.perform(patch("/api/owner/facilities/"+f.getId()+"/status").header("Authorization",auth(owner)).contentType("application/json").content("{\"status\":\"ACTIVE\"}"))
   .andExpect(status().isBadRequest());
  mvc.perform(put("/api/owner/facilities/"+f.getId()).header("Authorization",auth(owner)).contentType("application/json").content(body("ACTIVE")))
   .andExpect(status().isBadRequest());
  assertEquals(state,facilities.findById(f.getId()).orElseThrow().getStatus());
 }
 @ParameterizedTest @ValueSource(strings={"PAUSED","SUSPENDED","REJECTED","PENDING_APPROVAL"})
 void deleteThenResumeDoesNotEraseAdminDecision(String state) throws Exception {
  Facility f=facility(state,!state.equals("REJECTED")&&!state.equals("PENDING_APPROVAL"));
  booking(f,court(f),LocalDate.now().plusDays(1),BookingStatus.CONFIRMED);
  mvc.perform(delete("/api/owner/facilities/"+f.getId()).header("Authorization",auth(owner))).andExpect(status().isNoContent());
  assertEquals(state,facilities.findById(f.getId()).orElseThrow().getStatus());
  mvc.perform(patch("/api/owner/facilities/"+f.getId()+"/status").header("Authorization",auth(owner)).contentType("application/json").content("{\"status\":\"ACTIVE\"}"))
   .andExpect(status().isBadRequest());
 }
 @Test void ownerCanEditPendingProfileWithoutChangingApproval() throws Exception {
  Facility f=facility("PENDING_APPROVAL",false);
  mvc.perform(put("/api/owner/facilities/"+f.getId()).header("Authorization",auth(owner)).contentType("application/json").content(body(null)))
   .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PENDING_APPROVAL")).andExpect(jsonPath("$.isApproved").value(false));
 }
 @Test void adminCreateActiveFacilityHasConsistentApproval() throws Exception {
  mvc.perform(post("/api/owner/facilities").header("Authorization",auth(admin)).contentType("application/json").content(body("ACTIVE")))
   .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("ACTIVE")).andExpect(jsonPath("$.isApproved").value(true));
 }
 @Test void approveRejectAndPublicVisibilityUsePersistedFlag() throws Exception {
  Facility f=facility("PENDING_APPROVAL",false);
  mvc.perform(patch("/api/v1/admin/facilities/"+f.getId()+"/approval").header("Authorization",auth(admin)).contentType("application/json").content("{\"action\":\"APPROVE\"}"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.data.isApproved").value(true));
  assertTrue(facilities.findById(f.getId()).orElseThrow().getIsApproved());
  mvc.perform(get("/api/facilities/"+f.getId())).andExpect(status().isOk());
  mvc.perform(patch("/api/v1/admin/facilities/"+f.getId()+"/approval").header("Authorization",auth(admin)).contentType("application/json").content("{\"action\":\"REJECT\",\"rejectionReason\":\"Thiếu thông tin\"}"))
   .andExpect(status().isOk());
  assertFalse(facilities.findById(f.getId()).orElseThrow().getIsApproved());
  mvc.perform(get("/api/facilities/"+f.getId())).andExpect(status().isNotFound());
  mvc.perform(get("/api/owner/facilities").header("Authorization",auth(owner)))
   .andExpect(status().isOk()).andExpect(jsonPath("$[0].rejectionReason").value("Thiếu thông tin"));
 }
 @Test void paymentReadSerializesOutsideRepositorySession() throws Exception {
  Facility f=facility("ACTIVE",true);Booking b=booking(f,court(f),LocalDate.now().plusDays(1),BookingStatus.CONFIRMED);
  Payment pay=new Payment();pay.setBookingId(b.getId());pay.setProvider(PaymentProvider.MOCK);pay.setProviderOrderCode(System.nanoTime());pay.setAmount(BigDecimal.valueOf(110000));pay.setStatus(PaymentStatus.SUCCESS);payments.saveAndFlush(pay);
  mvc.perform(get("/api/payments/booking/"+b.getId()).header("Authorization",auth(customer)))
   .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("SUCCESS")).andExpect(jsonPath("$.data.booking").doesNotExist());
 }
 @Test void foreignCourtCannotBeAttachedToPriceRule() throws Exception {
  Facility f=facility("ACTIVE",true);Court ownCourt=court(f);
  Facility other=facility("ACTIVE",true);other.setOwnerId(otherOwner.getId());facilities.saveAndFlush(other);Court foreignCourt=court(other);
  PriceRule rule=new PriceRule();rule.setFacilityId(f.getId());rule.setCourtId(ownCourt.getId());rule.setName("Original");rule.setStartTime(LocalTime.of(18,0));rule.setEndTime(LocalTime.of(20,0));rule.setPricePerSlot(BigDecimal.valueOf(110000));rule=prices.saveAndFlush(rule);
  String payload="{\"name\":\"Hijack\",\"courtId\":"+foreignCourt.getId()+",\"startTime\":\"18:00\",\"endTime\":\"20:00\",\"pricePerSlot\":190000}";
  mvc.perform(put("/api/owner/price-rules/"+rule.getId()).header("Authorization",auth(owner)).contentType("application/json").content(payload)).andExpect(status().isBadRequest());
  PriceRule unchanged=prices.findById(rule.getId()).orElseThrow();assertEquals(ownCourt.getId(),unchanged.getCourtId());assertEquals("Original",unchanged.getName());
 }
 @ParameterizedTest @ValueSource(ints={-10,1})
 void deletingCourtWithPastOrFutureBookingsPreservesHistory(int days) throws Exception {
  Facility f=facility("ACTIVE",true);Court c=court(f);Booking b=booking(f,c,LocalDate.now().plusDays(days),BookingStatus.CONFIRMED);
  mvc.perform(delete("/api/owner/courts/"+c.getId()).header("Authorization",auth(owner))).andExpect(status().isNoContent());
  assertEquals("INACTIVE",courts.findById(c.getId()).orElseThrow().getStatus());assertTrue(bookings.existsById(b.getId()));
  mvc.perform(get("/api/bookings/"+b.getId()).header("Authorization",auth(customer))).andExpect(status().isOk());
 }
 @Test void nestedCourtValidationAndContactLengthRejectBeforePersistence() throws Exception {
  String negative=body("ACTIVE").replace("}",",\"courts\":[{\"name\":\"Bad\",\"basePricePerHour\":-100000}]}");
  mvc.perform(post("/api/owner/facilities").header("Authorization",auth(owner)).contentType("application/json").content(negative)).andExpect(status().isBadRequest());
  String longPhone=body("ACTIVE").replace("0901234567","1".repeat(301));
  mvc.perform(post("/api/owner/facilities").header("Authorization",auth(owner)).contentType("application/json").content(longPhone)).andExpect(status().isBadRequest());
 }
 @Test void compositeContactPersistsWithoutTruncation() throws Exception {
  Facility f=facility("PENDING_APPROVAL",false);
  String phone="0866866368 - Gọi khi đặt lịch vãng lai / Chốt lịch qua Zalo | 0364059999 - Gọi khi đặt lịch cố định / Khiếu nại dịch vụ";
  mvc.perform(put("/api/owner/facilities/"+f.getId()).header("Authorization",auth(owner)).contentType("application/json").content(body(null).replace("0901234567",phone)))
   .andExpect(status().isOk()).andExpect(jsonPath("$.phone").value(phone));
  assertEquals(phone,facilities.findById(f.getId()).orElseThrow().getPhone());
 }
 @Test void invalidStatusDoesNotMutateOwnerOrAdminFacility() throws Exception {
  Facility f=facility("INACTIVE",true);
  for(User actor:new User[]{owner,admin}) {
   String path=actor==admin?"/api/v1/admin/facilities/":"/api/owner/facilities/";
   mvc.perform(patch(path+f.getId()+"/status").header("Authorization",auth(actor)).contentType("application/json").content("{\"status\":\"INVALID\"}"))
    .andExpect(status().isBadRequest());
   assertEquals("INACTIVE",facilities.findById(f.getId()).orElseThrow().getStatus());
  }
 }
 @Test void guestAndCustomerCannotManageFacilities() throws Exception {
  for(User actor:new User[]{null,customer}) {
   var request=post("/api/owner/facilities").contentType("application/json").content(body("ACTIVE"));
   if(actor!=null)request.header("Authorization",auth(actor));
   mvc.perform(request).andExpect(status().isForbidden());
  }
 }
}
