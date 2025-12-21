CREATE TABLE
	IF NOT EXISTS `featherpanel_installed_plugins` (
		`id` INT (11) NOT NULL AUTO_INCREMENT,
		`name` VARCHAR(255) NOT NULL,
		`identifier` VARCHAR(255) NOT NULL,
		`cloud_id` INT (11) DEFAULT NULL,
		`version` VARCHAR(50) DEFAULT NULL,
		`installed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		`uninstalled_at` DATETIME DEFAULT NULL,
		PRIMARY KEY (`id`),
		UNIQUE KEY `installed_plugins_identifier_unique` (`identifier`),
		KEY `installed_plugins_cloud_id_index` (`cloud_id`)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;