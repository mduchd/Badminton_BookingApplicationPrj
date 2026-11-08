package com.badmintonbooking.admin.service;

import com.badmintonbooking.admin.entity.SystemSetting;
import com.badmintonbooking.admin.repository.SystemSettingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
public class SystemSettingService {

    private static final Logger log = LoggerFactory.getLogger(SystemSettingService.class);
    private final SystemSettingRepository settingRepository;

    public SystemSettingService(SystemSettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    @Transactional
    public SystemSetting getSetting() {
        return settingRepository.findById(1L).orElseGet(() -> {
            SystemSetting def = new SystemSetting();
            def.setId(1L);
            def.setCommissionRatePercent(5.0);
            def.setHoldMinutes(10);
            def.setPlatformName("SmashCourt Badminton Booking Platform");
            def.setHotline("1900 6868");
            def.setSupportEmail("support@smashcourt.vn");
            def.setBroadcastAnnouncement("Chào mừng đến với Nền tảng Đặt sân Cầu lông Toàn quốc SmashCourt!");
            def.setMaintenanceMode(false);
            def.setUpdatedAt(OffsetDateTime.now());
            def.setUpdatedBy("SYSTEM_INIT");
            return settingRepository.save(def);
        });
    }

    @Transactional(readOnly = true)
    public int getEffectiveHoldMinutes() {
        try {
            return settingRepository.findById(1L).map(SystemSetting::getHoldMinutes).orElse(10);
        } catch (Exception e) {
            log.warn("Lỗi khi đọc holdMinutes từ database, sử dụng mặc định 10 phút: {}", e.getMessage());
            return 10;
        }
    }

    @Transactional(readOnly = true)
    public double getEffectiveCommissionRate() {
        try {
            return settingRepository.findById(1L).map(SystemSetting::getCommissionRatePercent).orElse(5.0);
        } catch (Exception e) {
            log.warn("Lỗi khi đọc commissionRate từ database, sử dụng mặc định 5.0%: {}", e.getMessage());
            return 5.0;
        }
    }

    @Transactional(readOnly = true)
    public boolean isMaintenanceMode() {
        try {
            return settingRepository.findById(1L).map(s -> Boolean.TRUE.equals(s.getMaintenanceMode())).orElse(false);
        } catch (Exception e) {
            return false;
        }
    }

    @Transactional
    public SystemSetting saveSetting(SystemSetting setting, String updatedBy) {
        setting.setId(1L);
        setting.setUpdatedAt(OffsetDateTime.now());
        setting.setUpdatedBy(updatedBy != null ? updatedBy : "ADMIN");
        return settingRepository.save(setting);
    }
}
