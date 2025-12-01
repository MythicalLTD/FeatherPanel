CREATE TABLE
	IF NOT EXISTS `featherpanel_user_ssh_keys` (
		`id` int (11) NOT NULL AUTO_INCREMENT,
		`user_id` int (11) NOT NULL,
		`name` varchar(191) NOT NULL,
		`fingerprint` varchar(191) NOT NULL,
		`public_key` text NOT NULL,
		`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		`deleted_at` timestamp NULL DEFAULT NULL,
		PRIMARY KEY (`id`),
		KEY `user_ssh_keys_user_id_foreign` (`user_id`),
		CONSTRAINT `user_ssh_keys_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `featherpanel_users` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
