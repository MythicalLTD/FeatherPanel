-- Guarded with information_schema checks so it is safe to re-run and also works on MySQL 8.
-- Inactive server cleanup: per-server exemption and the cleanup stage (warned, suspended,
-- archiving, archive_failed), plus archives kept after a server is removed.
-- Per-user disk quota: an override in MiB (NULL = use the panel default, 0 = unlimited).
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_servers' AND COLUMN_NAME = 'inactivity_exempt') = 0,
	'ALTER TABLE `featherpanel_servers` ADD COLUMN `inactivity_exempt` tinyint (1) NOT NULL DEFAULT 0',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_servers' AND COLUMN_NAME = 'inactivity_stage') = 0,
	'ALTER TABLE `featherpanel_servers` ADD COLUMN `inactivity_stage` varchar(20) DEFAULT NULL',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_servers' AND COLUMN_NAME = 'inactivity_stage_at') = 0,
	'ALTER TABLE `featherpanel_servers` ADD COLUMN `inactivity_stage_at` timestamp NULL DEFAULT NULL',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_servers' AND COLUMN_NAME = 'inactivity_backup_id') = 0,
	'ALTER TABLE `featherpanel_servers` ADD COLUMN `inactivity_backup_id` int (11) DEFAULT NULL',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;

SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_users' AND COLUMN_NAME = 'disk_quota_mb') = 0,
	'ALTER TABLE `featherpanel_users` ADD COLUMN `disk_quota_mb` int (11) DEFAULT NULL',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;

CREATE TABLE IF NOT EXISTS `featherpanel_server_archives` (
	`id` int (11) NOT NULL AUTO_INCREMENT,
	`server_uuid` char(36) NOT NULL,
	`server_name` varchar(191) NOT NULL,
	`owner_id` int (11) DEFAULT NULL,
	`node_id` int (11) DEFAULT NULL,
	`spell_id` int (11) DEFAULT NULL,
	`backup_uuid` char(36) NOT NULL,
	`backup_disk` varchar(32) NOT NULL,
	`remote_ref` varchar(500) DEFAULT NULL,
	`bytes` bigint (20) UNSIGNED DEFAULT NULL,
	`checksum` varchar(191) DEFAULT NULL,
	`server_snapshot` mediumtext DEFAULT NULL,
	`last_activity_at` timestamp NULL DEFAULT NULL,
	`created_at` timestamp NOT NULL DEFAULT current_timestamp(),
	PRIMARY KEY (`id`),
	KEY `server_archives_owner_index` (`owner_id`),
	KEY `server_archives_created_index` (`created_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
