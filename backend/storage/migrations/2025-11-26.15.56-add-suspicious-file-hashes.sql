CREATE TABLE
	IF NOT EXISTS `featherpanel_suspicious_file_hashes` (
		`id` INT (11) NOT NULL AUTO_INCREMENT,
		`hash` VARCHAR(64) NOT NULL,
		`file_name` VARCHAR(255) NOT NULL,
		`detection_type` VARCHAR(100) NOT NULL,
		`server_uuid` CHAR(36) DEFAULT NULL,
		`server_name` VARCHAR(255) DEFAULT NULL,
		`node_id` INT (11) DEFAULT NULL,
		`file_path` TEXT DEFAULT NULL,
		`file_size` BIGINT (20) DEFAULT NULL,
		`times_detected` INT (11) NOT NULL DEFAULT 1,
		`confirmed_malicious` ENUM ('false', 'true') NOT NULL DEFAULT 'false',
		`metadata` LONGTEXT CHARACTER
		SET
			utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid (`metadata`)),
			`first_seen` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			`last_seen` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY (`id`),
			UNIQUE KEY `unique_hash` (`hash`),
			KEY `featherpanel_suspicious_file_hashes_hash_index` (`hash`),
			KEY `featherpanel_suspicious_file_hashes_server_uuid_index` (`server_uuid`),
			KEY `featherpanel_suspicious_file_hashes_detection_type_index` (`detection_type`),
			KEY `featherpanel_suspicious_file_hashes_first_seen_index` (`first_seen`),
			KEY `featherpanel_suspicious_file_hashes_confirmed_malicious_index` (`confirmed_malicious`)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;