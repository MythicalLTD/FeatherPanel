CREATE TABLE
	IF NOT EXISTS `featherpanel_sso_tokens` (
		`id` INT NOT NULL AUTO_INCREMENT,
		`token` VARCHAR(255) NOT NULL,
		`user_uuid` CHAR(36) NOT NULL,
		`used` ENUM ('false', 'true') NOT NULL DEFAULT 'false',
		`expires_at` DATETIME NOT NULL,
		`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		UNIQUE KEY `sso_tokens_token_unique` (`token`),
		KEY `sso_tokens_user_uuid_index` (`user_uuid`),
		KEY `sso_tokens_expires_at_index` (`expires_at`)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;