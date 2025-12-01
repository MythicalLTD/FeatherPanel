CREATE TABLE
	IF NOT EXISTS `featherpanel_server_activities` (
		`id` int (11) NOT NULL AUTO_INCREMENT,
		`server_id` int (11) NOT NULL,
		`node_id` int (11) NOT NULL,
		`user_id` int (11) DEFAULT NULL,
		`event` varchar(255) NOT NULL,
		`metadata` text DEFAULT NULL,
		`timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
		`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		KEY `server_activities_server_id_foreign` (`server_id`),
		KEY `server_activities_node_id_foreign` (`node_id`),
		KEY `server_activities_user_id_foreign` (`user_id`),
		KEY `server_activities_event_index` (`event`),
		KEY `server_activities_timestamp_index` (`timestamp`),
		CONSTRAINT `server_activities_server_id_foreign` FOREIGN KEY (`server_id`) REFERENCES `featherpanel_servers` (`id`) ON DELETE CASCADE,
		CONSTRAINT `server_activities_node_id_foreign` FOREIGN KEY (`node_id`) REFERENCES `featherpanel_nodes` (`id`) ON DELETE CASCADE,
		CONSTRAINT `server_activities_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `featherpanel_users` (`id`) ON DELETE SET NULL
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;