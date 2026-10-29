-- Guarded with information_schema checks so it is safe to re-run and also works on MySQL 8.
-- Bring-your-own backup storage: per-user destinations (S3 compatible now, OAuth providers later).
CREATE TABLE IF NOT EXISTS `featherpanel_user_storage_destinations` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`uuid` CHAR(36) NOT NULL,
	`user_id` INT(11) NOT NULL,
	`name` VARCHAR(191) NOT NULL,
	`provider` VARCHAR(32) NOT NULL DEFAULT 's3',
	`config` TEXT NOT NULL COMMENT 'Encrypted JSON (endpoint, bucket, keys or OAuth tokens)',
	`status` ENUM('active', 'error', 'revoked') NOT NULL DEFAULT 'active',
	`last_error` VARCHAR(500) DEFAULT NULL,
	`last_tested_at` TIMESTAMP NULL DEFAULT NULL,
	`deleted_at` TIMESTAMP NULL DEFAULT NULL,
	`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `user_storage_destinations_uuid_unique` (`uuid`),
	KEY `user_storage_destinations_user_id_index` (`user_id`),
	CONSTRAINT `user_storage_destinations_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `featherpanel_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NULL = node disk / admin storage. Not a foreign key: a removed destination leaves its backups orphaned, not deleted.
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_server_backups' AND COLUMN_NAME = 'destination_id') = 0,
	'ALTER TABLE `featherpanel_server_backups` ADD COLUMN `destination_id` INT(11) NULL DEFAULT NULL AFTER `disk`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_server_backups' AND INDEX_NAME = 'server_backups_destination_id_index') = 0,
	'ALTER TABLE `featherpanel_server_backups` ADD KEY `server_backups_destination_id_index` (`destination_id`)',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
