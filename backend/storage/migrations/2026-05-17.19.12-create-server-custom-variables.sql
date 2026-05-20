CREATE TABLE
	IF NOT EXISTS `featherpanel_server_custom_variables` (
		`id` int (11) NOT NULL AUTO_INCREMENT,
		`server_id` int (11) NOT NULL,
		`user_id` int (11) NOT NULL,
		`name` varchar(191) NOT NULL,
		`env_variable` varchar(191) NOT NULL,
		`variable_value` text NOT NULL,
		`is_encrypted` tinyint (1) NOT NULL DEFAULT 0,
		`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		UNIQUE KEY `server_custom_variables_server_env_unique` (`server_id`, `env_variable`),
		KEY `server_custom_variables_server_id_foreign` (`server_id`),
		KEY `server_custom_variables_user_id_foreign` (`user_id`),
		CONSTRAINT `server_custom_variables_server_id_foreign` FOREIGN KEY (`server_id`) REFERENCES `featherpanel_servers` (`id`) ON DELETE CASCADE,
		CONSTRAINT `server_custom_variables_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `featherpanel_users` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
