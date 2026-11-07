package com.badmintonbooking.booking.service;

import com.badmintonbooking.booking.dto.CheckoutRequest;
import com.badmintonbooking.booking.dto.CheckoutResponse;
import com.badmintonbooking.booking.entity.Booking;
import com.badmintonbooking.booking.entity.CourtOccupancy;
import com.badmintonbooking.booking.entity.Payment;
import com.badmintonbooking.booking.entity.PaymentWebhookEvent;
import com.badmintonbooking.booking.enums.ActiveStatus;
import com.badmintonbooking.booking.enums.BookingStatus;
import com.badmintonbooking.booking.enums.OccupancyType;
import com.badmintonbooking.booking.enums.PaymentProvider;
import com.badmintonbooking.booking.enums.PaymentStatus;
import com.badmintonbooking.booking.event.BookingPaymentConfirmedEvent;
import com.badmintonbooking.booking.repository.BookingRepository;
import com.badmintonbooking.booking.repository.CourtOccupancyRepository;
import com.badmintonbooking.booking.repository.PaymentRepository;
import com.badmintonbooking.booking.repository.PaymentWebhookEventRepository;
import com.badmintonbooking.common.exception.BadRequestException;
import com.badmintonbooking.common.exception.ResourceNotFoundException;
import com.badmintonbooking.court.entity.Court;
import com.badmintonbooking.court.entity.Facility;
import com.badmintonbooking.court.repository.CourtRepository;
import com.badmintonbooking.court.repository.FacilityRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    @Value("${payos.client-id:}")
    private String payOsClientId;

    @Value("${payos.api-key:}")
    private String payOsApiKey;

    @Value("${payos.checksum-key:}")
    private String payOsChecksumKey;

    @Value("${PAYOS_ENABLED:false}")
    private boolean payOsEnabled;

    @Value("${payment.mock-enabled:false}")
    private boolean mockEnabled;

    @Value("${payment.frontend-url:https://smashcourt-booking.netlify.app}")
    private String frontendUrl;

    private final BookingRepository bookingRepository;
    private final CourtOccupancyRepository occupancyRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentWebhookEventRepository webhookEventRepository;
    private final CourtRepository courtRepository;
    private final FacilityRepository facilityRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final PayOsHelper payOsHelper;
    private final Environment environment;

    public PaymentService(BookingRepository bookingRepository,
                          CourtOccupancyRepository occupancyRepository,
                          PaymentRepository paymentRepository,
                          PaymentWebhookEventRepository webhookEventRepository,
                          CourtRepository courtRepository,
                          FacilityRepository facilityRepository,
                          ApplicationEventPublisher eventPublisher,
                          PayOsHelper payOsHelper, Environment environment) {
        this.bookingRepository = bookingRepository;
        this.occupancyRepository = occupancyRepository;
        this.paymentRepository = paymentRepository;
        this.webhookEventRepository = webhookEventRepository;
        this.courtRepository = courtRepository;
        this.facilityRepository = facilityRepository;
        this.eventPublisher = eventPublisher;
        this.payOsHelper = payOsHelper;
        this.environment = environment;
    }

    @Transactional
    public CheckoutResponse createCheckout(Long bookingId, CheckoutRequest request, Long customerId) {
        Booking booking = ownedBooking(bookingId, customerId);

        if (booking.getStatus() == BookingStatus.CONFIRMED || booking.getStatus() == BookingStatus.COMPLETED) {
            throw new BadRequestException("Đơn đặt sân này đã được thanh toán xác nhận thành công!");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.EXPIRED) {
            throw new BadRequestException("Đơn đặt sân này đã bị hủy hoặc hết hạn giữ chỗ!");
        }

        OffsetDateTime now = OffsetDateTime.now();
        if (booking.getHoldExpiresAt() != null && booking.getHoldExpiresAt().isBefore(now)) {
            booking.setStatus(BookingStatus.EXPIRED);
            bookingRepository.save(booking);
            throw new BadRequestException("Đã hết thời gian giữ chỗ 10 phút. Vui lòng chọn lại khung giờ mới!");
        }

        String method = request.getResolvedPaymentMethod();
        if (!method.equals("PAYOS") && !method.equals("MOCK")) throw new BadRequestException("Phương thức thanh toán không hợp lệ");
        if (method.equals("MOCK") && !mockAllowed()) throw new BadRequestException("Thanh toán thử nghiệm không khả dụng");
        PaymentProvider provider = method.equals("PAYOS") ? PaymentProvider.PAYOS : PaymentProvider.MOCK;
        if (provider == PaymentProvider.PAYOS && (!payOsEnabled || isBlank(payOsClientId) || isBlank(payOsApiKey) || isBlank(payOsChecksumKey))) {
            throw new BadRequestException("Thanh toán trực tuyến tạm thời chưa khả dụng");
        }

        // Sinh orderCode ngẫu nhiên duy nhất (dương 9-10 chữ số)
        long orderCode = (System.currentTimeMillis() % 1000000000L) + (long) (Math.random() * 1000);

        Optional<Payment> existing = paymentRepository.findByBookingId(bookingId);
        if (existing.isPresent() && existing.get().getStatus() == PaymentStatus.PENDING) {
            throw new BadRequestException("Đơn đã có phiên thanh toán đang chờ. Vui lòng hoàn tất phiên đã mở.");
        }
        if (existing.isPresent() && existing.get().getStatus() == PaymentStatus.SUCCESS) {
            throw new BadRequestException("Đơn này đã thanh toán.");
        }
        Payment payment = existing.orElseGet(() -> {
            Payment p = new Payment();
            p.setBookingId(bookingId);
            return p;
        });

        payment.setProvider(provider);
        payment.setProviderOrderCode(orderCode);
        payment.setAmount(booking.getTotalAmount());
        payment.setStatus(PaymentStatus.PENDING);
        paymentRepository.save(payment);

        booking.setStatus(BookingStatus.PENDING_PAYMENT);
        booking.setUpdatedAt(now);
        bookingRepository.save(booking);

        String checkoutUrl = "/booking/checkout/" + booking.getId();
        String qrUrl = null;

        if (provider == PaymentProvider.PAYOS) {
            // Redirect destinations are controlled by the server, not the caller.
            String returnUrl = frontendUrl + "/payment/success";
            String cancelUrl = frontendUrl + "/payment/cancel";
            String desc = "SmashCourt #" + booking.getId();
            PayOsHelper.PayOsPaymentLinkResult payOsRes = payOsHelper.createPaymentLink(
                    payOsClientId, payOsApiKey, payOsChecksumKey,
                    orderCode, booking.getTotalAmount().longValueExact(), desc, returnUrl, cancelUrl);
            if (!payOsRes.success() || isBlank(payOsRes.checkoutUrl()) || !payOsRes.checkoutUrl().startsWith("https://")) {
                throw new BadRequestException("Không thể tạo phiên thanh toán. Vui lòng thử lại sau.");
            }
            checkoutUrl = payOsRes.checkoutUrl();
            qrUrl = payOsRes.qrCode();
            if (!isBlank(payOsRes.paymentLinkId())) {
                payment.setTransactionRef(payOsRes.paymentLinkId());
                paymentRepository.save(payment);
            }
        }

        return new CheckoutResponse(
                booking.getId(),
                orderCode,
                booking.getTotalAmount(),
                provider.name(),
                checkoutUrl,
                qrUrl,
                booking.getStatus().name(),
                booking.getHoldExpiresAt(),
                "Khởi tạo phiên thanh toán " + provider.name() + " thành công."
        );
    }

    @Transactional
    public CheckoutResponse processMockSuccess(Long bookingId, Long orderCode, Long customerId) {
        if (!mockAllowed()) throw new BadRequestException("Thanh toán thử nghiệm không khả dụng");
        Booking booking = ownedBooking(bookingId, customerId);

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            return toCheckoutResponse(booking, orderCode, "Đơn đã được xác nhận thanh toán trước đó.");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.EXPIRED) {
            throw new BadRequestException("Không thể thanh toán đơn đã bị hủy hoặc hết hạn!");
        }

        OffsetDateTime now = OffsetDateTime.now();

        // 1. Cập nhật Payment
        Payment payment = paymentRepository.findByBookingId(bookingId).orElseGet(() -> {
            Payment p = new Payment();
            p.setBookingId(bookingId);
            p.setProvider(PaymentProvider.MOCK);
            p.setProviderOrderCode(orderCode != null ? orderCode : System.currentTimeMillis());
            p.setAmount(booking.getTotalAmount());
            return p;
        });

        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAt(now);
        payment.setTransactionRef("MOCK-TXN-" + System.currentTimeMillis());
        paymentRepository.save(payment);

        // 2. Chuyển Booking sang CONFIRMED
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setUpdatedAt(now);
        bookingRepository.save(booking);

        // 3. Đổi occupancy sang BOOKING
        List<CourtOccupancy> occupancies = occupancyRepository.findByBookingId(bookingId);
        for (CourtOccupancy occ : occupancies) {
            occ.setOccupancyType(OccupancyType.BOOKING);
            occ.setActiveStatus(ActiveStatus.ACTIVE);
            occupancyRepository.save(occ);
        }

        // 4. Bắn Spring Event nội bộ cho TV1 (Notification, WebSocket, Calendar sync)
        publishConfirmedEvent(booking, payment.getProviderOrderCode(), "MOCK");

        log.info("Mock payment completed successfully: bookingId={}, amount={}", bookingId, booking.getTotalAmount());

        return toCheckoutResponse(booking, payment.getProviderOrderCode(), "Thanh toán giả lập thành công! Lịch đã được xác nhận.");
    }

    @Transactional
    public boolean processPayOsWebhook(Map<String, Object> payload) {
        if (!payOsEnabled) throw new BadRequestException("Thanh toán payOS chưa được kích hoạt");
        if (isBlank(payOsChecksumKey)) throw new BadRequestException("Webhook thanh toán chưa được cấu hình");
        if (payload == null || !(payload.get("data") instanceof Map<?, ?> rawData)
                || !(payload.get("signature") instanceof String signature) || signature.isBlank()) {
            throw new BadRequestException("Webhook thanh toán không hợp lệ");
        }
        TreeMap<String, String> fields = new TreeMap<>();
        for (var entry : rawData.entrySet()) {
            if (!(entry.getKey() instanceof String key)) throw new BadRequestException("Webhook không hợp lệ");
            Object value = entry.getValue();
            if (value instanceof Map || value instanceof List) throw new BadRequestException("Webhook không hợp lệ");
            String text = value == null ? "" : value.toString();
            fields.put(key, (text.equals("null") || text.equals("undefined")) ? "" : text);
        }
        String signed = fields.entrySet().stream().map(e -> e.getKey() + "=" + e.getValue())
                .collect(java.util.stream.Collectors.joining("&"));
        String expected = payOsHelper.calculateHmacSha256(signed, payOsChecksumKey);
        if (isBlank(expected) || !MessageDigest.isEqual(expected.toLowerCase(java.util.Locale.ROOT).getBytes(StandardCharsets.US_ASCII),
                signature.toLowerCase(java.util.Locale.ROOT).getBytes(StandardCharsets.US_ASCII))) {
            throw new BadRequestException("Chữ ký webhook payOS không hợp lệ");
        }
        // Only signed successful transactions can alter bookings.
        if (!Boolean.TRUE.equals(payload.get("success")) || !"00".equals(fields.get("code"))) return true;
        final long orderCode;
        final BigDecimal amount;
        try {
            orderCode = Long.parseLong(fields.getOrDefault("orderCode", ""));
            amount = new BigDecimal(fields.getOrDefault("amount", ""));
        } catch (NumberFormatException e) {
            throw new BadRequestException("Thông tin giao dịch không hợp lệ");
        }
        String reference = fields.getOrDefault("reference", "");
        if (reference.isBlank()) throw new BadRequestException("Thiếu mã giao dịch");
        Optional<Payment> paymentOpt = paymentRepository.findByProviderOrderCode(orderCode);
        // payOS sends signed sample payloads to verify webhook setup.
        if (paymentOpt.isEmpty()) return true;
        Payment existingPayment = paymentOpt.get();
        if (existingPayment.getProvider() != PaymentProvider.PAYOS || existingPayment.getAmount() == null
                || existingPayment.getAmount().compareTo(amount) != 0 || !"VND".equals(fields.get("currency"))) {
            throw new BadRequestException("Thông tin thanh toán không khớp");
        }
        if (existingPayment.getStatus() == PaymentStatus.SUCCESS) return true;
        if (existingPayment.getTransactionRef() != null && !existingPayment.getTransactionRef().equals(fields.get("paymentLinkId"))) {
            throw new BadRequestException("Mã liên kết thanh toán không khớp");
        }
        // 3. Idempotency Check (TC04): chống xử lý trùng lặp khi webhook gửi lại nhiều lần
        String eventKey = "PAYOS-" + orderCode + "-" + reference;
        if (webhookEventRepository.existsByProviderEventKey(eventKey)) {
            log.info("Webhook payOS lặp đã được xử lý trước đó: eventKey={}", eventKey);
            return true;
        }

        if (existingPayment.getStatus() != PaymentStatus.PENDING) throw new BadRequestException("Giao dịch không còn hiệu lực");

        Payment payment = paymentOpt.get();
        Booking booking = bookingRepository.findById(payment.getBookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy booking tương ứng với thanh toán!"));

        OffsetDateTime now = OffsetDateTime.now();

        // 4. Xử lý webhook đến trễ sau khi hold đã hết hạn (TC05)
        if ((booking.getStatus() != BookingStatus.HELD && booking.getStatus() != BookingStatus.PENDING_PAYMENT)
                || (booking.getHoldExpiresAt() != null && booking.getHoldExpiresAt().isBefore(now))) {
            log.warn("Webhook thanh toán tới sau khi đơn đã hết hạn: bookingId={}, status={}", booking.getId(), booking.getStatus());
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);

            PaymentWebhookEvent event = new PaymentWebhookEvent();
            event.setProviderEventKey(eventKey);
            event.setOrderCode(orderCode);
            event.setProcessedAt(now);
            event.setResult("MANUAL_REFUND_REQUIRED");
            webhookEventRepository.save(event);
            return true;
        }

        // 5. Cập nhật Payment và Booking sang trạng thái thành công
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAt(now);
        payment.setTransactionRef(reference);
        paymentRepository.save(payment);

        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setUpdatedAt(now);
        bookingRepository.save(booking);

        List<CourtOccupancy> occupancies = occupancyRepository.findByBookingId(booking.getId());
        for (CourtOccupancy occ : occupancies) {
            occ.setOccupancyType(OccupancyType.BOOKING);
            occ.setActiveStatus(ActiveStatus.ACTIVE);
            occupancyRepository.save(occ);
        }

        // 6. Ghi nhật ký Idempotency
        PaymentWebhookEvent event = new PaymentWebhookEvent();
        event.setProviderEventKey(eventKey);
        event.setOrderCode(orderCode);
        event.setProcessedAt(now);
        event.setResult("SUCCESS");
        webhookEventRepository.save(event);

        // 7. Bắn Event cho TV1
        publishConfirmedEvent(booking, orderCode, "PAYOS");

        log.info("payOS Webhook verified and processed successfully: bookingId={}, orderCode={}", booking.getId(), orderCode);
        return true;
    }

    @Transactional(readOnly = true)
    public Payment getPaymentByBookingId(Long bookingId, Long customerId) {
        ownedBooking(bookingId, customerId);
        return paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch cho đơn #" + bookingId));
    }

    private Booking ownedBooking(Long bookingId, Long customerId) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt sân"));
        if (customerId == null || !customerId.equals(booking.getCustomerId())) {
            throw new ResourceNotFoundException("Không tìm thấy đơn đặt sân");
        }
        return booking;
    }

    private boolean mockAllowed() { return mockEnabled && !environment.acceptsProfiles(Profiles.of("prod")); }

    private static boolean isBlank(String value) { return value == null || value.isBlank(); }

    private void publishConfirmedEvent(Booking booking, Long orderCode, String paymentMethod) {
        String courtName = courtRepository.findById(booking.getCourtId()).map(Court::getName).orElse("Sân đấu");
        String facilityName = facilityRepository.findById(booking.getFacilityId()).map(Facility::getName).orElse("Cụm sân");

        BookingPaymentConfirmedEvent event = new BookingPaymentConfirmedEvent(
                booking.getId(),
                booking.getCustomerId(),
                booking.getCourtId(),
                courtName,
                booking.getFacilityId(),
                facilityName,
                booking.getBookingDate(),
                booking.getStartTime(),
                booking.getEndTime(),
                booking.getTotalAmount(),
                orderCode,
                paymentMethod
        );

        eventPublisher.publishEvent(event);
    }

    private CheckoutResponse toCheckoutResponse(Booking b, Long orderCode, String message) {
        return new CheckoutResponse(
                b.getId(),
                orderCode,
                b.getTotalAmount(),
                "MOCK",
                "/booking/checkout/" + b.getId(),
                null,
                b.getStatus().name(),
                b.getHoldExpiresAt(),
                message
        );
    }
}
