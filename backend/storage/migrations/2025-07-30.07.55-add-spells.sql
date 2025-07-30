CREATE TABLE
	`mythicalpanel_spells` (
		`id` int (11) NOT NULL AUTO_INCREMENT,
		`uuid` char(36) NOT NULL,
		`realm_id` int (11) NOT NULL,
		`author` varchar(191) NOT NULL,
		`name` varchar(191) NOT NULL,
		`description` text DEFAULT NULL,
		`features` longtext CHARACTER
		SET
			utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid (`features`)),
			`docker_images` longtext CHARACTER
		SET
			utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid (`docker_images`)),
			`file_denylist` longtext CHARACTER
		SET
			utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid (`file_denylist`)),
			`update_url` text DEFAULT NULL,
			`config_files` text DEFAULT NULL,
			`config_startup` text DEFAULT NULL,
			`config_logs` text DEFAULT NULL,
			`config_stop` varchar(191) DEFAULT NULL,
			`config_from` int (11) DEFAULT NULL,
			`startup` text DEFAULT NULL,
			`script_container` varchar(191) NOT NULL DEFAULT 'alpine:3.4',
			`copy_script_from` int (11) DEFAULT NULL,
			`script_entry` varchar(191) NOT NULL DEFAULT 'ash',
			`script_is_privileged` tinyint (1) NOT NULL DEFAULT 1,
			`script_install` text DEFAULT NULL,
			`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
			`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			`force_outgoing_ip` tinyint (1) NOT NULL DEFAULT 0,
			PRIMARY KEY (`id`),
			UNIQUE KEY `spells_uuid_unique` (`uuid`),
			KEY `spells_realm_id_foreign` (`realm_id`),
			KEY `spells_config_from_foreign` (`config_from`),
			KEY `spells_copy_script_from_foreign` (`copy_script_from`),
			CONSTRAINT `spells_config_from_foreign` FOREIGN KEY (`config_from`) REFERENCES `mythicalpanel_spells` (`id`) ON DELETE SET NULL,
			CONSTRAINT `spells_copy_script_from_foreign` FOREIGN KEY (`copy_script_from`) REFERENCES `mythicalpanel_spells` (`id`) ON DELETE SET NULL,
			CONSTRAINT `spells_realm_id_foreign` FOREIGN KEY (`realm_id`) REFERENCES `mythicalpanel_realms` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;