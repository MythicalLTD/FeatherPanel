CREATE TABLE
	IF NOT EXISTS `featherpanel_server_schedules_tasks` (
		`id` int(11) NOT NULL AUTO_INCREMENT,
		`schedule_id` int(11) NOT NULL,
		`sequence_id` int(11) NOT NULL,
		`action` varchar(191) NOT NULL,
		`payload` text NOT NULL,
		`time_offset` int(11) NOT NULL DEFAULT 0,
		`is_queued` tinyint(1) NOT NULL DEFAULT 0,
		`continue_on_failure` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
		`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		KEY `tasks_schedule_id_sequence_id_index` (`schedule_id`, `sequence_id`),
		KEY `tasks_action_index` (`action`),
		KEY `tasks_is_queued_index` (`is_queued`),
		CONSTRAINT `tasks_schedule_id_foreign` FOREIGN KEY (`schedule_id`) REFERENCES `featherpanel_server_schedules` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
