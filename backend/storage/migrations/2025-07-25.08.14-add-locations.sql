CREATE TABLE
	`mythicalpanel_locations` (
		`id` int (11) NOT NULL AUTO_INCREMENT,
		`name` varchar(255) NOT NULL,
		`description` text DEFAULT NULL,
		`ip_address` varchar(255) DEFAULT NULL,
		`country` varchar(255) DEFAULT NULL,
		`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;