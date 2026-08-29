CREATE TABLE IF NOT EXISTS `featherpanel_webspace_schedules` (
	`id` int(11) NOT NULL AUTO_INCREMENT,
	`webspace_id` int(11) NOT NULL,
	`name` varchar(191) NOT NULL,
	`cron_day_of_week` varchar(191) NOT NULL,
	`cron_month` varchar(191) NOT NULL,
	`cron_day_of_month` varchar(191) NOT NULL,
	`cron_hour` varchar(191) NOT NULL,
	`cron_minute` varchar(191) NOT NULL,
	`timezone` varchar(64) NOT NULL DEFAULT 'UTC',
	`is_active` tinyint(1) NOT NULL DEFAULT 1,
	`is_processing` tinyint(1) NOT NULL DEFAULT 0,
	`last_run_at` timestamp NULL DEFAULT NULL,
	`next_run_at` timestamp NULL DEFAULT NULL,
	`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `webspace_schedules_webspace_id_foreign` (`webspace_id`),
	CONSTRAINT `webspace_schedules_webspace_id_foreign` FOREIGN KEY (`webspace_id`) REFERENCES `featherpanel_webspaces` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `featherpanel_webspace_schedule_tasks` (
	`id` int(11) NOT NULL AUTO_INCREMENT,
	`schedule_id` int(11) NOT NULL,
	`sequence_id` int(11) NOT NULL,
	`action` varchar(191) NOT NULL,
	`payload` text NOT NULL,
	`time_offset` int(11) NOT NULL DEFAULT 0,
	`continue_on_failure` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
	`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `webspace_tasks_schedule_id_sequence_id_index` (`schedule_id`, `sequence_id`),
	CONSTRAINT `webspace_tasks_schedule_id_foreign` FOREIGN KEY (`schedule_id`) REFERENCES `featherpanel_webspace_schedules` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
