package com.badmintonbooking.admin.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "system_settings")
public class SystemSetting {

    @Id
    private Long id = 1L;

    @Column(name = "commission_rate_percent", nullable = false)
    private Double commissionRatePercent = 5.0;

    @Column(name = "hold_minutes", nullable = false)
    private Integer holdMinutes = 10;

    @Column(name = "platform_name", nullable = false)
    private String platformName = "SmashCourt Badminton Booking Platform";

    @Column(name = "hotline", nullable = false)
    private String hotline = "1900 6868";

    @Column(name = "support_email", nullable = false)
    private String supportEmail = "support@smashcourt.vn";

    @Column(name = "broadcast_announcement", columnDefinition = "TEXT")
    private String broadcastAnnouncement = "Chào mừng đến với Nền tảng Đặt sân Cầu lông Toàn quốc SmashCourt!";

    @Column(name = "maintenance_mode", nullable = false)
    private Boolean maintenanceMode = false;

    @Column(name = "system_amenities_json", columnDefinition = "TEXT")
    private String systemAmenitiesJson = "[\"Đèn chiếu sáng tiêu chuẩn BWF\",\"Điều hòa nhiệt độ\",\"Bãi đỗ xe ô tô & xe máy\",\"Căn tin giải khát & quầy đồ ăn\",\"Dịch vụ cho thuê vợt & bán quả cầu\",\"Wifi tốc độ cao miễn phí\",\"Tủ đồ cá nhân an toàn\",\"Phòng tắm & thay đồ nóng lạnh\"]";

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @Column(name = "updated_by")
    private String updatedBy = "SYSTEM";

    public SystemSetting() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Double getCommissionRatePercent() { return commissionRatePercent; }
    public void setCommissionRatePercent(Double commissionRatePercent) { this.commissionRatePercent = commissionRatePercent; }

    public Integer getHoldMinutes() { return holdMinutes; }
    public void setHoldMinutes(Integer holdMinutes) { this.holdMinutes = holdMinutes; }

    public String getPlatformName() { return platformName; }
    public void setPlatformName(String platformName) { this.platformName = platformName; }

    public String getHotline() { return hotline; }
    public void setHotline(String hotline) { this.hotline = hotline; }

    public String getSupportEmail() { return supportEmail; }
    public void setSupportEmail(String supportEmail) { this.supportEmail = supportEmail; }

    public String getBroadcastAnnouncement() { return broadcastAnnouncement; }
    public void setBroadcastAnnouncement(String broadcastAnnouncement) { this.broadcastAnnouncement = broadcastAnnouncement; }

    public Boolean getMaintenanceMode() { return maintenanceMode; }
    public void setMaintenanceMode(Boolean maintenanceMode) { this.maintenanceMode = maintenanceMode; }

    public String getSystemAmenitiesJson() { return systemAmenitiesJson; }
    public void setSystemAmenitiesJson(String systemAmenitiesJson) { this.systemAmenitiesJson = systemAmenitiesJson; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
