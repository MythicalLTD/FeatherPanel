CREATE TABLE
	IF NOT EXISTS `mythicalpanel_mail_templates` (
		`id` INT AUTO_INCREMENT PRIMARY KEY,
		`name` VARCHAR(255) NOT NULL,
		`subject` VARCHAR(255) NOT NULL,
		`body` TEXT NOT NULL,
		`deleted` ENUM ('false', 'true') NOT NULL DEFAULT 'false',
		`locked` ENUM ('false', 'true') NOT NULL DEFAULT 'false',
		`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		`updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		UNIQUE (`name`)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;