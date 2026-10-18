CREATE TABLE IF NOT EXISTS `featherpanel_server_resource_samples` (
	`server_id` INT(11) NOT NULL,
	`sampled_at` DATETIME NOT NULL,
	`cpu` DECIMAL(8,2) NOT NULL DEFAULT 0,
	`memory_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
	`disk_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
	PRIMARY KEY (`server_id`, `sampled_at`),
	KEY `server_resource_samples_sampled_at_index` (`sampled_at`),
	CONSTRAINT `server_resource_samples_server_id_foreign` FOREIGN KEY (`server_id`) REFERENCES `featherpanel_servers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
