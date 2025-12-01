CREATE TABLE
	IF NOT EXISTS `featherpanel_server_variables` (
		`id` int (11) NOT NULL AUTO_INCREMENT,
		`server_id` int (11) NOT NULL,
		`variable_id` int (11) NOT NULL,
		`variable_value` text NOT NULL,
		`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		KEY `server_variables_server_id_foreign` (`server_id`),
		KEY `server_variables_variable_id_foreign` (`variable_id`),
		CONSTRAINT `server_variables_server_id_foreign` FOREIGN KEY (`server_id`) REFERENCES `featherpanel_servers` (`id`) ON DELETE CASCADE,
		CONSTRAINT `server_variables_variable_id_foreign` FOREIGN KEY (`variable_id`) REFERENCES `featherpanel_spell_variables` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;