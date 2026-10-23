ALTER TABLE `featherpanel_server_transfers`
	ADD COLUMN `power_state_before` VARCHAR(32) NULL DEFAULT NULL AFTER `metadata`,
	ADD COLUMN `restore_power_state` TINYINT(1) NOT NULL DEFAULT 1 AFTER `power_state_before`,
	ADD COLUMN `power_restore_status` VARCHAR(16) NULL DEFAULT NULL AFTER `restore_power_state`,
	ADD COLUMN `power_restore_attempts` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `power_restore_status`,
	ADD COLUMN `power_restore_error` TEXT NULL DEFAULT NULL AFTER `power_restore_attempts`,
	ADD COLUMN `power_restore_next_at` DATETIME NULL DEFAULT NULL AFTER `power_restore_error`,
	ADD KEY `server_transfers_power_restore_index` (`power_restore_status`, `power_restore_next_at`);
