ALTER TABLE `featherpanel_servers`
ADD COLUMN `auto_start` TINYINT(1) NOT NULL DEFAULT 0 AFTER `show_on_status`,
ADD COLUMN `manually_stopped` TINYINT(1) NOT NULL DEFAULT 0 AFTER `auto_start`,
ADD COLUMN `auto_start_delay` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `manually_stopped`;

CREATE TABLE IF NOT EXISTS `featherpanel_server_auto_start_queue` (
	`id` INT NOT NULL AUTO_INCREMENT,
	`server_id` INT(11) NOT NULL,
	`node_id` INT(11) NOT NULL,
	`scheduled_at` DATETIME NOT NULL,
	`status` ENUM('pending', 'processing', 'completed', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
	`attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
	`last_error` TEXT DEFAULT NULL,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `auto_start_queue_status_scheduled_index` (`status`, `scheduled_at`),
	KEY `auto_start_queue_server_id_index` (`server_id`),
	KEY `auto_start_queue_node_id_index` (`node_id`),
	CONSTRAINT `auto_start_queue_server_id_foreign`
		FOREIGN KEY (`server_id`)
		REFERENCES `featherpanel_servers` (`id`)
		ON DELETE CASCADE,
	CONSTRAINT `auto_start_queue_node_id_foreign`
		FOREIGN KEY (`node_id`)
		REFERENCES `featherpanel_nodes` (`id`)
		ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
