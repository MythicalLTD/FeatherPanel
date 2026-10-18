CREATE TABLE IF NOT EXISTS `featherpanel_user_notifications` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`user_id` INT(11) NOT NULL,
	`kind` VARCHAR(32) NOT NULL,
	`data` TEXT NOT NULL,
	`link` VARCHAR(255) DEFAULT NULL,
	`group_key` VARCHAR(191) DEFAULT NULL,
	`count` INT UNSIGNED NOT NULL DEFAULT 1,
	`read_at` TIMESTAMP NULL DEFAULT NULL,
	`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `user_notifications_user_created_index` (`user_id`, `created_at`),
	KEY `user_notifications_user_read_index` (`user_id`, `read_at`),
	KEY `user_notifications_user_group_index` (`user_id`, `group_key`),
	KEY `user_notifications_created_index` (`created_at`),
	CONSTRAINT `user_notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `featherpanel_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `featherpanel_announcement_reads` (
	`user_id` INT(11) NOT NULL,
	`notification_id` BIGINT(20) UNSIGNED NOT NULL,
	`read_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (`user_id`, `notification_id`),
	KEY `announcement_reads_notification_index` (`notification_id`),
	CONSTRAINT `announcement_reads_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `featherpanel_users` (`id`) ON DELETE CASCADE,
	CONSTRAINT `announcement_reads_notification_id_foreign` FOREIGN KEY (`notification_id`) REFERENCES `featherpanel_notifications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
