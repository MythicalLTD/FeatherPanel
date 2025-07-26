CREATE TABLE
	IF NOT EXISTS `mythicalpanel_realms` (
		`id` INT (11) NOT NULL AUTO_INCREMENT,
		`name` VARCHAR(255) NOT NULL,
		`description` TEXT,
		`logo` VARCHAR(255) DEFAULT "https://github.com/mythicalltd.png",
		`author` VARCHAR(255) DEFAULT "support@mythical.systems",
		`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		`updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;