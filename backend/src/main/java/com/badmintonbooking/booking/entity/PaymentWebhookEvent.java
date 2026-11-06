package com.badmintonbooking.booking.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "payment_webhook_events")
public class PaymentWebhookEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "provider_event_key", nullable = false, unique = true)
    private String providerEventKey;

    @Column(name = "order_code")
    private Long orderCode;

    @Column(name = "raw_payload_hash")
    private String rawPayloadHash;

    @Column(name = "processed_at", nullable = false)
    private OffsetDateTime processedAt = OffsetDateTime.now();

    @Column(nullable = false)
    private String result;

    public PaymentWebhookEvent() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getProviderEventKey() { return providerEventKey; }
    public void setProviderEventKey(String providerEventKey) { this.providerEventKey = providerEventKey; }

    public Long getOrderCode() { return orderCode; }
    public void setOrderCode(Long orderCode) { this.orderCode = orderCode; }

    public String getRawPayloadHash() { return rawPayloadHash; }
    public void setRawPayloadHash(String rawPayloadHash) { this.rawPayloadHash = rawPayloadHash; }

    public OffsetDateTime getProcessedAt() { return processedAt; }
    public void setProcessedAt(OffsetDateTime processedAt) { this.processedAt = processedAt; }

    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }
}
