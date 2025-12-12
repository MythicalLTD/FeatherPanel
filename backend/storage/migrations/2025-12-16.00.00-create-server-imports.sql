CREATE TABLE
	IF NOT EXISTS `featherpanel_server_imports` (
		`id` INT NOT NULL AUTO_INCREMENT,
		`server_id` INT NOT NULL,
		`user` VARCHAR(255) NOT NULL,
		`host` VARCHAR(255) NOT NULL,
		`port` INT NOT NULL,
		`source_location` VARCHAR(500) NOT NULL,
		`destination_location` VARCHAR(500) NOT NULL,
		`type` ENUM ('sftp', 'ftp') NOT NULL,
		`wipe` TINYINT (1) NOT NULL DEFAULT 0,
		`wipe_all_files` TINYINT (1) NOT NULL DEFAULT 0,
		`status` ENUM ('pending', 'importing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
		`error` TEXT NULL,
		`started_at` TIMESTAMP NULL,
		`completed_at` TIMESTAMP NULL,
		`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		KEY `server_imports_server_id_index` (`server_id`),
		KEY `server_imports_status_index` (`status`),
		KEY `server_imports_created_at_index` (`created_at`),
		CONSTRAINT `server_imports_server_id_foreign` FOREIGN KEY (`server_id`) REFERENCES `featherpanel_servers` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;