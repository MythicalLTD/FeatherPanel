CREATE TABLE IF NOT EXISTS `featherpanel_user_devices` (
	`id` INT NOT NULL AUTO_INCREMENT,
	`user_uuid` CHAR(36) NOT NULL,
	`device_hash` CHAR(64) NOT NULL,
	`signal_hash` CHAR(64) DEFAULT NULL,
	`signals` JSON DEFAULT NULL,
	`ip_address` VARCHAR(45) DEFAULT NULL,
	`user_agent` VARCHAR(512) DEFAULT NULL,
	`first_seen` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`last_seen` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`hit_count` INT NOT NULL DEFAULT 1,
	PRIMARY KEY (`id`),
	UNIQUE KEY `user_devices_user_device_unique` (`user_uuid`, `device_hash`),
	KEY `user_devices_device_hash_index` (`device_hash`),
	KEY `user_devices_signal_hash_index` (`signal_hash`),
	KEY `user_devices_user_uuid_index` (`user_uuid`),
	CONSTRAINT `user_devices_user_uuid_foreign`
		FOREIGN KEY (`user_uuid`)
		REFERENCES `featherpanel_users` (`uuid`)
		ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
