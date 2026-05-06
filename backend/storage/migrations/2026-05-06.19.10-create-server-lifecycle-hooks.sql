CREATE TABLE
	IF NOT EXISTS `featherpanel_server_lifecycle_hooks` (
		`id` int(11) NOT NULL AUTO_INCREMENT,
		`server_id` int(11) NOT NULL,
		`hook_type` varchar(32) NOT NULL,
		`is_active` tinyint(1) NOT NULL DEFAULT 1,
		`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		UNIQUE KEY `server_lifecycle_hooks_server_type_unique` (`server_id`, `hook_type`),
		KEY `server_lifecycle_hooks_server_idx` (`server_id`),
		CONSTRAINT `server_lifecycle_hooks_server_id_foreign` FOREIGN KEY (`server_id`) REFERENCES `featherpanel_servers` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE
	IF NOT EXISTS `featherpanel_server_lifecycle_hook_steps` (
		`id` int(11) NOT NULL AUTO_INCREMENT,
		`hook_id` int(11) NOT NULL,
		`sequence_id` int(11) NOT NULL,
		`task_type` varchar(64) NOT NULL,
		`payload` longtext NOT NULL,
		`continue_on_failure` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
		`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		KEY `server_lifecycle_hook_steps_hook_sequence_idx` (`hook_id`, `sequence_id`),
		KEY `server_lifecycle_hook_steps_task_type_idx` (`task_type`),
		CONSTRAINT `server_lifecycle_hook_steps_hook_id_foreign` FOREIGN KEY (`hook_id`) REFERENCES `featherpanel_server_lifecycle_hooks` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
