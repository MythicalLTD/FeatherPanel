CREATE TABLE IF NOT EXISTS `featherpanel_webspace_transfers` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`webspace_uuid` CHAR(36) NOT NULL,
	`source_web_node_id` INT(11) NOT NULL,
	`dest_web_node_id` INT(11) NOT NULL,
	`status` VARCHAR(32) NOT NULL DEFAULT 'pending',
	`error` TEXT NULL DEFAULT NULL,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`completed_at` TIMESTAMP NULL DEFAULT NULL,
	PRIMARY KEY (`id`),
	KEY `featherpanel_webspace_transfers_uuid` (`webspace_uuid`),
	KEY `featherpanel_webspace_transfers_status` (`status`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
