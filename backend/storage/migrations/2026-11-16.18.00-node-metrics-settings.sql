CREATE TABLE IF NOT EXISTS `featherpanel_node_metrics_settings` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`node_kind` ENUM('wings', 'web') NOT NULL,
	`node_id` INT(11) NOT NULL,
	`metrics_url` VARCHAR(512) DEFAULT NULL,
	`metrics_token` TEXT DEFAULT NULL,
	`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `node_metrics_settings_node_unique` (`node_kind`, `node_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
