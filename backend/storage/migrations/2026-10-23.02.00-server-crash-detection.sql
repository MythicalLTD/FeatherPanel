-- Guarded with information_schema checks so it is safe to re-run and also works on MySQL 8.
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_servers' AND COLUMN_NAME = 'crash_auto_restart') = 0,
	'ALTER TABLE `featherpanel_servers` ADD COLUMN `crash_auto_restart` TINYINT(1) NOT NULL DEFAULT 1 AFTER `auto_start_delay`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_servers' AND COLUMN_NAME = 'last_crash_at') = 0,
	'ALTER TABLE `featherpanel_servers` ADD COLUMN `last_crash_at` DATETIME NULL DEFAULT NULL AFTER `crash_auto_restart`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_servers' AND COLUMN_NAME = 'last_crash_log') = 0,
	'ALTER TABLE `featherpanel_servers` ADD COLUMN `last_crash_log` MEDIUMTEXT NULL DEFAULT NULL AFTER `last_crash_at`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
