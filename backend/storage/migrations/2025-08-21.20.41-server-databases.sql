CREATE TABLE
	IF NOT EXISTS `featherpanel_server_databases` (
		`id` int(11) NOT NULL AUTO_INCREMENT,
		`server_id` int(11) NOT NULL,
		`database_host_id` int(11) NOT NULL,
		`database` varchar(191) NOT NULL,
		`username` varchar(191) NOT NULL,
		`remote` varchar(191) NOT NULL DEFAULT '%',
		`password` text NOT NULL,
		`max_connections` int(11) NOT NULL DEFAULT 0,
		`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		KEY `server_databases_server_id_index` (`server_id`),
		KEY `server_databases_database_host_id_index` (`database_host_id`),
		KEY `server_databases_database_index` (`database`),
		KEY `server_databases_username_index` (`username`),
		KEY `server_databases_created_at_index` (`created_at`),
		KEY `server_databases_updated_at_index` (`updated_at`),
		CONSTRAINT `server_databases_server_id_foreign` FOREIGN KEY (`server_id`) REFERENCES `featherpanel_servers` (`id`) ON DELETE CASCADE,
		CONSTRAINT `server_databases_database_host_id_foreign` FOREIGN KEY (`database_host_id`) REFERENCES `featherpanel_databases` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
