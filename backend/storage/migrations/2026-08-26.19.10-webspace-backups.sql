CREATE TABLE IF NOT EXISTS `featherpanel_webspace_backups` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`uuid` CHAR(36) NOT NULL,
	`webspace_id` INT(11) NOT NULL,
	`name` VARCHAR(191) DEFAULT NULL,
	`bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
	`checksum` VARCHAR(128) DEFAULT NULL,
	`status` VARCHAR(32) NOT NULL DEFAULT 'pending',
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`completed_at` TIMESTAMP NULL DEFAULT NULL,
	PRIMARY KEY (`id`),
	UNIQUE KEY `featherpanel_webspace_backups_uuid_unique` (`uuid`),
	KEY `featherpanel_webspace_backups_webspace_id` (`webspace_id`),
	CONSTRAINT `featherpanel_webspace_backups_webspace_id_foreign`
		FOREIGN KEY (`webspace_id`) REFERENCES `featherpanel_webspaces` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
