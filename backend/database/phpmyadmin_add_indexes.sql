-- Copy and paste this into phpMyAdmin SQL tab
-- Step 3: Add indexes for better performance

CREATE INDEX `idx_alerts_truck_code` ON `alerts`(`truck_code`);
CREATE INDEX `idx_alerts_type` ON `alerts`(`type`);
CREATE INDEX `idx_alerts_alert_time` ON `alerts`(`alert_time`);
CREATE INDEX `idx_alerts_is_read` ON `alerts`(`is_read`);
CREATE INDEX `idx_alerts_priority` ON `alerts`(`priority`);
