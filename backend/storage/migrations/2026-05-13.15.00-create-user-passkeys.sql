CREATE TABLE IF NOT EXISTS `featherpanel_user_passkeys` (
	`id` INT NOT NULL AUTO_INCREMENT,
	`user_uuid` CHAR(36) NOT NULL,
	`credential_id` VARBINARY(1023) NOT NULL,
	`public_key` BLOB NOT NULL,
	`sign_count` BIGINT UNSIGNED NOT NULL DEFAULT 0,
	`transports` JSON NULL DEFAULT NULL,
	`aaguid` CHAR(36) NULL DEFAULT NULL,
	`attestation_type` VARCHAR(32) NOT NULL DEFAULT 'none',
	`label` VARCHAR(191) NULL DEFAULT NULL,
	`backup_eligible` TINYINT(1) NULL DEFAULT NULL,
	`backup_status` TINYINT(1) NULL DEFAULT NULL,
	`uv_initialized` TINYINT(1) NULL DEFAULT NULL,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `user_passkeys_credential_id_unique` (`credential_id`),
	KEY `user_passkeys_user_uuid_index` (`user_uuid`),
	CONSTRAINT `user_passkeys_user_uuid_foreign`
		FOREIGN KEY (`user_uuid`)
		REFERENCES `featherpanel_users` (`uuid`)
		ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
