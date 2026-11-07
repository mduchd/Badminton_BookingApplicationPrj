package com.badmintonbooking.booking.service;

import com.badmintonbooking.booking.dto.CheckoutRequest;
import com.badmintonbooking.booking.dto.CheckoutResponse;
import com.badmintonbooking.booking.dto.PayOsWebhookRequest;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
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

    private final BookingRepository bookingRepository;
    private final CourtOccupancyRepository occupancyRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentWebhookEventRepository webhookEventRepository;
    private final CourtRepository courtRepository;
    private final FacilityRepository facilityRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final PayOsHelper payOsHelper;

    public PaymentService(BookingRepository bookingRepository,
                          CourtOccupancyRepository occupancyRepository,
                          PaymentRepository paymentRepository,
                          PaymentWebhookEventRepository webhookEventRepository,
                          CourtRepository courtRepository,
                          FacilityRepository facilityRepository,
                          ApplicationEventPublisher eventPublisher,
                          PayOsHelper payOsHelper) {
        this.bookingRepository = bookingRepository;
        this.occupancyRepository = occupancyRepository;
        this.paymentRepository = paymentRepository;
        this.webhookEventRepository = webhookEventRepository;
        this.courtRepository = courtRepository;
        this.facilityRepository = facilityRepository;
        this.eventPublisher = eventPublisher;
        this.payOsHelper = payOsHelper;
    }

    @Transactional
    public CheckoutResponse createCheckout(Long bookingId, CheckoutRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt sân #" + bookingId));

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
        PaymentProvider provider = method.equals("PAYOS") ? PaymentProvider.PAYOS : PaymentProvider.MOCK;

        // Sinh orderCode ngẫu nhiên duy nhất (dương 9-10 chữ số)
        long orderCode = (System.currentTimeMillis() % 1000000000L) + (long) (Math.random() * 1000);

        Payment payment = paymentRepository.findByBookingId(bookingId).orElseGet(() -> {
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

        // Nếu người dùng chọn payOS và đã cấu hình key -> Gọi API chính thức của payOS v2
        if (provider == PaymentProvider.PAYOS && payOsClientId != null && !payOsClientId.isBlank()) {
            String returnUrl = request.returnUrl() != null && !request.returnUrl().isBlank()
                    ? request.returnUrl()
                    : "http://localhost:5173/payment/success";
            String cancelUrl = request.cancelUrl() != null && !request.cancelUrl().isBlank()
                    ? request.cancelUrl()
                    : "http://localhost:5173/payment/cancel";

            String desc = "SmashCourt #" + booking.getId();
            PayOsHelper.PayOsPaymentLinkResult payOsRes = payOsHelper.createPaymentLink(
                    payOsClientId, payOsApiKey, payOsChecksumKey,
                    orderCode, booking.getTotalAmount().longValue(), desc, returnUrl, cancelUrl
            );

            if (payOsRes.success()) {
                checkoutUrl = payOsRes.checkoutUrl();
                qrUrl = payOsRes.qrCode();
                if (payOsRes.paymentLinkId() != null) {
                    payment.setTransactionRef(payOsRes.paymentLinkId());
                    paymentRepository.save(payment);
                }
                log.info("Khởi tạo live payOS link thành công: checkoutUrl={}, qrCode={}", checkoutUrl, qrUrl);
            } else {
                log.warn("Không thể tạo link live payOS ({}), sử dụng VietQR fallback", payOsRes.message());
            }
        }

        // Fallback VietQR nếu payOS offline hoặc là mock
        if (qrUrl == null) {
            qrUrl = payOsHelper.generateVietQrUrl(
                    "970422", // Mã BIN ngân hàng Quân Đội (MB Bank)
                    "0987654321",
                    booking.getTotalAmount(),
                    "Thanh toan san SmashCourt #" + booking.getId()
            );
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
    public CheckoutResponse processMockSuccess(Long bookingId, Long orderCode) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt sân #" + bookingId));

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
    public boolean processPayOsWebhook(PayOsWebhookRequest payload) {
        if (payload == null || payload.data() == null) {
            log.info("Tiếp nhận ping kiểm tra Webhook payOS (health check) -> Phản hồi HTTP 200 OK.");
            return true;
        }

        PayOsWebhookRequest.PayOsWebhookData data = payload.data();
        long orderCode = data.orderCode();
        String reference = data.reference() != null ? data.reference() : ("REF-" + orderCode);

        // 1. Tra cứu Payment theo orderCode
        Optional<Payment> paymentOpt = paymentRepository.findByProviderOrderCode(orderCode);
        if (paymentOpt.isEmpty()) {
            log.info("Tiếp nhận Webhook payOS cho orderCode test hoặc không tồn tại trong hệ thống (xác thực Webhook thành công): orderCode={}", orderCode);
            return true;
        }

        // 2. Xác thực chữ ký HMAC-SHA256 (nếu đã cấu hình PAYOS_CHECKSUM_KEY)
        if (payOsChecksumKey != null && !payOsChecksumKey.isBlank() && payload.signature() != null) {
            String rawData = String.format("amount=%d&description=%s&orderCode=%d",
                    data.amount().longValue(),
                    data.description() != null ? data.description() : "",
                    orderCode
            );
            String expectedSignature = payOsHelper.calculateHmacSha256(rawData, payOsChecksumKey);
            if (expectedSignature == null || !expectedSignature.equalsIgnoreCase(payload.signature())) {
                log.warn("Chữ ký Webhook payOS không khớp: expected={}, got={}", expectedSignature, payload.signature());
                Map<String, Object> dataMap = new java.util.TreeMap<>();
                dataMap.put("accountNumber", data.accountNumber() != null ? data.accountNumber() : "");
                dataMap.put("amount", data.amount().longValue());
                dataMap.put("code", data.code() != null ? data.code() : "");
                dataMap.put("currency", data.currency() != null ? data.currency() : "");
                dataMap.put("description", data.description() != null ? data.description() : "");
                dataMap.put("orderCode", orderCode);
                dataMap.put("paymentLinkId", data.paymentLinkId() != null ? data.paymentLinkId() : "");
                dataMap.put("reference", reference);
                dataMap.put("transactionDateTime", data.transactionDateTime() != null ? data.transactionDateTime() : "");

                StringBuilder sb = new StringBuilder();
                for (Map.Entry<String, Object> entry : dataMap.entrySet()) {
                    if (entry.getValue() != null && !entry.getValue().toString().isEmpty()) {
                        if (sb.length() > 0) sb.append("&");
                        sb.append(entry.getKey()).append("=").append(entry.getValue());
                    }
                }
                String altSignature = payOsHelper.calculateHmacSha256(sb.toString(), payOsChecksumKey);
                if (altSignature == null || !altSignature.equalsIgnoreCase(payload.signature())) {
                    log.error("Xác thực chữ ký payOS thất bại: payload signature={}", payload.signature());
                    throw new BadRequestException("Chữ ký webhook payOS không hợp lệ!");
                }
            }
        }

        // 3. Idempotency Check (TC04): chống xử lý trùng lặp khi webhook gửi lại nhiều lần
        String eventKey = "PAYOS-" + orderCode + "-" + reference;
        if (webhookEventRepository.existsByProviderEventKey(eventKey)) {
            log.info("Webhook payOS lặp đã được xử lý trước đó: eventKey={}", eventKey);
            return true;
        }

        Payment payment = paymentOpt.get();
        Booking booking = bookingRepository.findById(payment.getBookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy booking tương ứng với thanh toán!"));

        OffsetDateTime now = OffsetDateTime.now();

        // 4. Xử lý webhook đến trễ sau khi hold đã hết hạn (TC05)
        if (booking.getStatus() == BookingStatus.EXPIRED || booking.getStatus() == BookingStatus.CANCELLED) {
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
    public Payment getPaymentByBookingId(Long bookingId) {
        return paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch cho đơn #" + bookingId));
    }

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
