ALTER TABLE `featherpanel_servers`
ADD COLUMN `crash_auto_restart` TINYINT(1) NOT NULL DEFAULT 1 AFTER `auto_start_delay`,
ADD COLUMN `last_crash_at` DATETIME NULL DEFAULT NULL AFTER `crash_auto_restart`,
ADD COLUMN `last_crash_log` MEDIUMTEXT NULL DEFAULT NULL AFTER `last_crash_at`;
