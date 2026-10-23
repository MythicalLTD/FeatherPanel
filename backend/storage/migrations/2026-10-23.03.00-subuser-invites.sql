CREATE TABLE IF NOT EXISTS `featherpanel_server_subuser_invites` (
	`id` INT NOT NULL AUTO_INCREMENT,
	`server_id` INT(11) NOT NULL,
	`token_hash` CHAR(64) NOT NULL,
	`permissions` TEXT NOT NULL,
	`created_by` INT(11) NOT NULL,
	`max_uses` INT UNSIGNED NOT NULL DEFAULT 1,
	`uses` INT UNSIGNED NOT NULL DEFAULT 0,
	`expires_at` DATETIME NOT NULL,
	`revoked_at` DATETIME NULL DEFAULT NULL,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `subuser_invites_token_hash_unique` (`token_hash`),
	KEY `subuser_invites_server_id_index` (`server_id`),
	CONSTRAINT `subuser_invites_server_id_foreign` FOREIGN KEY (`server_id`) REFERENCES `featherpanel_servers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
