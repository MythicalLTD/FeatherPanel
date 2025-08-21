CREATE TABLE
	IF NOT EXISTS `featherpanel_backups` (
		`id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
		`server_id` int(11) NOT NULL,
		`uuid` char(36) NOT NULL,
		`upload_id` text DEFAULT NULL,
		`is_successful` tinyint(1) NOT NULL DEFAULT 0,
		`is_locked` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
		`name` varchar(191) NOT NULL,
		`ignored_files` text NOT NULL,
		`disk` varchar(191) NOT NULL,
		`checksum` varchar(191) DEFAULT NULL,
		`bytes` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
		`completed_at` timestamp NULL DEFAULT NULL,
		`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		`deleted_at` timestamp NULL DEFAULT NULL,
		PRIMARY KEY (`id`),
		UNIQUE KEY `backups_uuid_unique` (`uuid`),
		KEY `backups_server_id_foreign` (`server_id`),
		CONSTRAINT `backups_server_id_foreign` FOREIGN KEY (`server_id`) REFERENCES `featherpanel_servers` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
