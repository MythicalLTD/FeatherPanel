CREATE TABLE
	IF NOT EXISTS `featherpanel_allocations` (
		`id` int (11) NOT NULL AUTO_INCREMENT,
		`node_id` int (11) NOT NULL,
		`ip` varchar(191) NOT NULL,
		`ip_alias` text DEFAULT NULL,
		`port` mediumint (8) UNSIGNED NOT NULL,
		`server_id` int (11) DEFAULT NULL,
		`notes` varchar(191) DEFAULT NULL,
		`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		UNIQUE KEY `allocations_node_id_ip_port_unique` (`node_id`, `ip`, `port`),
		KEY `allocations_node_id_foreign` (`node_id`),
		KEY `allocations_server_id_foreign` (`server_id`),
		CONSTRAINT `allocations_node_id_foreign` FOREIGN KEY (`node_id`) REFERENCES `featherpanel_nodes` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;