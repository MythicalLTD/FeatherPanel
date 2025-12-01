CREATE TABLE
	IF NOT EXISTS `featherpanel_apikeys_client` (
		`id` INT AUTO_INCREMENT PRIMARY KEY,
		`user_uuid` CHAR(36) NOT NULL,
		`name` VARCHAR(255) NOT NULL,
		`public_key` VARCHAR(255) NOT NULL,
		`private_key` VARCHAR(255) NOT NULL,
		`description` TEXT DEFAULT NULL,
		`allowed_ips` TEXT DEFAULT NULL,
		`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		`updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (`user_uuid`) REFERENCES `featherpanel_users` (`uuid`) ON DELETE CASCADE,
		UNIQUE KEY (`public_key`, `private_key`)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;