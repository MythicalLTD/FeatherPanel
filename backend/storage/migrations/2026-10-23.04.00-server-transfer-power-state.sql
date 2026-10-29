-- Guarded with information_schema checks so it is safe to re-run and also works on MySQL 8.
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_server_transfers' AND COLUMN_NAME = 'power_state_before') = 0,
	'ALTER TABLE `featherpanel_server_transfers` ADD COLUMN `power_state_before` VARCHAR(32) NULL DEFAULT NULL AFTER `metadata`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_server_transfers' AND COLUMN_NAME = 'restore_power_state') = 0,
	'ALTER TABLE `featherpanel_server_transfers` ADD COLUMN `restore_power_state` TINYINT(1) NOT NULL DEFAULT 1 AFTER `power_state_before`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_server_transfers' AND COLUMN_NAME = 'power_restore_status') = 0,
	'ALTER TABLE `featherpanel_server_transfers` ADD COLUMN `power_restore_status` VARCHAR(16) NULL DEFAULT NULL AFTER `restore_power_state`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_server_transfers' AND COLUMN_NAME = 'power_restore_attempts') = 0,
	'ALTER TABLE `featherpanel_server_transfers` ADD COLUMN `power_restore_attempts` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `power_restore_status`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_server_transfers' AND COLUMN_NAME = 'power_restore_error') = 0,
	'ALTER TABLE `featherpanel_server_transfers` ADD COLUMN `power_restore_error` TEXT NULL DEFAULT NULL AFTER `power_restore_attempts`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_server_transfers' AND COLUMN_NAME = 'power_restore_next_at') = 0,
	'ALTER TABLE `featherpanel_server_transfers` ADD COLUMN `power_restore_next_at` DATETIME NULL DEFAULT NULL AFTER `power_restore_error`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_server_transfers' AND INDEX_NAME = 'server_transfers_power_restore_index') = 0,
	'ALTER TABLE `featherpanel_server_transfers` ADD KEY `server_transfers_power_restore_index` (`power_restore_status`, `power_restore_next_at`)',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
