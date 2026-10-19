CREATE TABLE IF NOT EXISTS `featherpanel_user_sessions` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`user_id` INT(11) NOT NULL,
	`token_hash` CHAR(64) NOT NULL,
	`account_token_hash` CHAR(64) NOT NULL,
	`ip_address` VARCHAR(64) DEFAULT NULL,
	`user_agent` VARCHAR(512) DEFAULT NULL,
	`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`last_seen_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`revoked_at` TIMESTAMP NULL DEFAULT NULL,
	PRIMARY KEY (`id`),
	UNIQUE KEY `user_sessions_token_hash_unique` (`token_hash`),
	KEY `user_sessions_user_index` (`user_id`, `revoked_at`),
	CONSTRAINT `user_sessions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `featherpanel_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
