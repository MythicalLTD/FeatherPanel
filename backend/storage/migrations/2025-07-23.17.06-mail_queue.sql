CREATE TABLE
	IF NOT EXISTS `featherpanel_mail_queue` (
		`id` INT AUTO_INCREMENT PRIMARY KEY,
		`user_uuid` CHAR(36) NOT NULL,
		`subject` VARCHAR(255) NOT NULL,
		`body` TEXT NOT NULL,
		`status` ENUM ('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
		`deleted` ENUM ('false', 'true') NOT NULL DEFAULT 'false',
		`locked` ENUM ('false', 'true') NOT NULL DEFAULT 'false',
		`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		`updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (`user_uuid`) REFERENCES `featherpanel_users` (`uuid`) ON DELETE RESTRICT
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;