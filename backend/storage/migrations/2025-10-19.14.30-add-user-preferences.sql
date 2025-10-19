CREATE TABLE IF NOT EXISTS `featherpanel_user_preferences` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`user_uuid` CHAR(36) NOT NULL,
	`preferences` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
		CHECK (json_valid(`preferences`)),
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `user_preferences_user_uuid_unique` (`user_uuid`),
	KEY `user_preferences_user_uuid_foreign` (`user_uuid`),
	CONSTRAINT `user_preferences_user_uuid_foreign`
		FOREIGN KEY (`user_uuid`)
		REFERENCES `featherpanel_users` (`uuid`)
		ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

