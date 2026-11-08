package com.badmintonbooking.admin.repository;

import com.badmintonbooking.admin.entity.SystemSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SystemSettingRepository extends JpaRepository<SystemSetting, Long> {
}
