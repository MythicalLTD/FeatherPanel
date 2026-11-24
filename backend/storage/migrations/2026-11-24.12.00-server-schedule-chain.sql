-- Server schedules now run their tasks one cron tick at a time instead of
-- sleeping inside the cron runner for each task's time_offset. These columns
-- keep which tasks of the current run were already sent, when the next task is
-- due, and a short lease with a claim token so two overlapping cron runs never
-- handle the same schedule.
SET @cnt := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'featherpanel_server_schedules'
      AND COLUMN_NAME = 'chain_next_at'
);
SET @sql := IF(@cnt = 0,
    'ALTER TABLE `featherpanel_server_schedules`
        ADD COLUMN `chain_next_at` TIMESTAMP NULL DEFAULT NULL AFTER `next_run_at`,
        ADD COLUMN `chain_done_tasks` TEXT NULL DEFAULT NULL AFTER `chain_next_at`,
        ADD COLUMN `chain_executed` INT(11) UNSIGNED NOT NULL DEFAULT 0 AFTER `chain_done_tasks`,
        ADD COLUMN `chain_failed` INT(11) UNSIGNED NOT NULL DEFAULT 0 AFTER `chain_executed`,
        ADD COLUMN `chain_locked_until` TIMESTAMP NULL DEFAULT NULL AFTER `chain_failed`,
        ADD COLUMN `chain_claim` VARCHAR(32) NULL DEFAULT NULL AFTER `chain_locked_until`',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
