CREATE TABLE
	IF NOT EXISTS `featherpanel_server_schedules` (
		`id` int(11) NOT NULL AUTO_INCREMENT,
		`server_id` int(11) NOT NULL,
		`name` varchar(191) NOT NULL,
		`cron_day_of_week` varchar(191) NOT NULL,
		`cron_month` varchar(191) NOT NULL,
		`cron_day_of_month` varchar(191) NOT NULL,
		`cron_hour` varchar(191) NOT NULL,
		`cron_minute` varchar(191) NOT NULL,
		`is_active` tinyint(1) NOT NULL,
		`is_processing` tinyint(1) NOT NULL,
		`only_when_online` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
		`last_run_at` timestamp NULL DEFAULT NULL,
		`next_run_at` timestamp NULL DEFAULT NULL,
		`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		KEY `schedules_server_id_foreign` (`server_id`),
		CONSTRAINT `schedules_server_id_foreign` FOREIGN KEY (`server_id`) REFERENCES `featherpanel_servers` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
