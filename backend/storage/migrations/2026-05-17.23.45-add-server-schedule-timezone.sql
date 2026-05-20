-- Add a per-schedule timezone column so each server cron schedule can be
-- evaluated in whichever zone the user actually authored it for (e.g. a
-- nightly backup at 03:00 should mean 03:00 local for that user, not 03:00
-- UTC). Defaults to 'UTC' so existing schedules keep their current
-- behaviour without any surprise time shift.
SET @cnt := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'featherpanel_server_schedules'
      AND COLUMN_NAME = 'timezone'
);
SET @sql := IF(@cnt = 0,
    "ALTER TABLE `featherpanel_server_schedules` ADD COLUMN `timezone` VARCHAR(64) NOT NULL DEFAULT 'UTC' AFTER `cron_minute`",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
