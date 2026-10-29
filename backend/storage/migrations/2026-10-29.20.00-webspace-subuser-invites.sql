CREATE TABLE IF NOT EXISTS `featherpanel_webspace_subuser_invites` (
	`id` INT NOT NULL AUTO_INCREMENT,
	`webspace_id` INT(11) NOT NULL,
	`token_hash` CHAR(64) NOT NULL,
	`permissions` TEXT NOT NULL,
	`created_by` INT(11) NOT NULL,
	`max_uses` INT UNSIGNED NOT NULL DEFAULT 1,
	`uses` INT UNSIGNED NOT NULL DEFAULT 0,
	`expires_at` DATETIME NOT NULL,
	`revoked_at` DATETIME NULL DEFAULT NULL,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `webspace_subuser_invites_token_hash_unique` (`token_hash`),
	KEY `webspace_subuser_invites_webspace_id_index` (`webspace_id`),
	CONSTRAINT `webspace_subuser_invites_webspace_id_foreign` FOREIGN KEY (`webspace_id`) REFERENCES `featherpanel_webspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
