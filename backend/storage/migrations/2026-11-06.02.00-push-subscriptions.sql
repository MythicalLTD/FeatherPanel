CREATE TABLE IF NOT EXISTS `featherpanel_push_subscriptions` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`user_id` INT(11) NOT NULL,
	`endpoint` VARCHAR(512) NOT NULL,
	`p256dh` VARCHAR(255) NOT NULL,
	`auth` VARCHAR(255) NOT NULL,
	`content_encoding` VARCHAR(32) NOT NULL DEFAULT 'aes128gcm',
	`user_agent` VARCHAR(512) DEFAULT NULL,
	`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `push_subscriptions_endpoint_unique` (`endpoint`),
	KEY `push_subscriptions_user_index` (`user_id`),
	CONSTRAINT `push_subscriptions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `featherpanel_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
