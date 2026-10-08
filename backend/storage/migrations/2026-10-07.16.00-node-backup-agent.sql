CREATE TABLE IF NOT EXISTS `featherpanel_node_backup_destinations` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`uuid` CHAR(36) NOT NULL,
	`name` VARCHAR(191) NOT NULL,
	`type` ENUM('sftp', 's3') NOT NULL,
	`credentials_encrypted` LONGTEXT NOT NULL,
	`base_path` VARCHAR(512) NOT NULL DEFAULT '',
	`is_mirror` TINYINT(1) NOT NULL DEFAULT 0,
	`mirror_of` INT(11) DEFAULT NULL,
	`last_tested_at` TIMESTAMP NULL DEFAULT NULL,
	`last_test_ok` TINYINT(1) DEFAULT NULL,
	`last_test_error` TEXT DEFAULT NULL,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `node_backup_destinations_uuid_unique` (`uuid`),
	KEY `node_backup_destinations_type_index` (`type`),
	KEY `node_backup_destinations_mirror_of_foreign` (`mirror_of`),
	CONSTRAINT `node_backup_destinations_mirror_of_foreign` FOREIGN KEY (`mirror_of`) REFERENCES `featherpanel_node_backup_destinations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `featherpanel_node_backup_policies` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`uuid` CHAR(36) NOT NULL,
	`name` VARCHAR(191) NOT NULL,
	`scope_type` ENUM('all_nodes', 'nodes') NOT NULL DEFAULT 'all_nodes',
	`mode` ENUM('volumes', 'full', 'user_backups_only') NOT NULL DEFAULT 'full',
	`primary_destination_id` INT(11) NOT NULL,
	`cron_day_of_week` VARCHAR(191) NOT NULL,
	`cron_month` VARCHAR(191) NOT NULL,
	`cron_day_of_month` VARCHAR(191) NOT NULL,
	`cron_hour` VARCHAR(191) NOT NULL,
	`cron_minute` VARCHAR(191) NOT NULL,
	`timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC',
	`is_active` TINYINT(1) NOT NULL DEFAULT 1,
	`is_processing` TINYINT(1) NOT NULL DEFAULT 0,
	`retention_days` INT(11) NOT NULL DEFAULT 90,
	`delete_local_after_upload` TINYINT(1) NOT NULL DEFAULT 1,
	`concurrency` TINYINT(3) UNSIGNED NOT NULL DEFAULT 1,
	`notify_on_failure` TINYINT(1) NOT NULL DEFAULT 1,
	`last_run_at` TIMESTAMP NULL DEFAULT NULL,
	`next_run_at` TIMESTAMP NULL DEFAULT NULL,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `node_backup_policies_uuid_unique` (`uuid`),
	KEY `node_backup_policies_scope_type_index` (`scope_type`),
	KEY `node_backup_policies_primary_destination_foreign` (`primary_destination_id`),
	KEY `node_backup_policies_is_active_next_run_index` (`is_active`, `next_run_at`),
	CONSTRAINT `node_backup_policies_primary_destination_foreign` FOREIGN KEY (`primary_destination_id`) REFERENCES `featherpanel_node_backup_destinations` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `featherpanel_node_backup_policy_nodes` (
	`policy_id` INT(11) NOT NULL,
	`node_id` INT(11) NOT NULL,
	PRIMARY KEY (`policy_id`, `node_id`),
	KEY `node_backup_policy_nodes_node_id_foreign` (`node_id`),
	CONSTRAINT `node_backup_policy_nodes_policy_id_foreign` FOREIGN KEY (`policy_id`) REFERENCES `featherpanel_node_backup_policies` (`id`) ON DELETE CASCADE,
	CONSTRAINT `node_backup_policy_nodes_node_id_foreign` FOREIGN KEY (`node_id`) REFERENCES `featherpanel_nodes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `featherpanel_node_backup_policy_mirrors` (
	`policy_id` INT(11) NOT NULL,
	`destination_id` INT(11) NOT NULL,
	PRIMARY KEY (`policy_id`, `destination_id`),
	KEY `node_backup_policy_mirrors_destination_id_foreign` (`destination_id`),
	CONSTRAINT `node_backup_policy_mirrors_policy_id_foreign` FOREIGN KEY (`policy_id`) REFERENCES `featherpanel_node_backup_policies` (`id`) ON DELETE CASCADE,
	CONSTRAINT `node_backup_policy_mirrors_destination_id_foreign` FOREIGN KEY (`destination_id`) REFERENCES `featherpanel_node_backup_destinations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `featherpanel_node_backup_runs` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`policy_id` INT(11) NOT NULL,
	`status` ENUM('pending', 'running', 'completed', 'failed', 'partial') NOT NULL DEFAULT 'pending',
	`nodes_total` INT(11) NOT NULL DEFAULT 0,
	`nodes_ok` INT(11) NOT NULL DEFAULT 0,
	`nodes_failed` INT(11) NOT NULL DEFAULT 0,
	`nodes_skipped` INT(11) NOT NULL DEFAULT 0,
	`started_at` TIMESTAMP NULL DEFAULT NULL,
	`completed_at` TIMESTAMP NULL DEFAULT NULL,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `node_backup_runs_policy_id_foreign` (`policy_id`),
	KEY `node_backup_runs_status_index` (`status`),
	CONSTRAINT `node_backup_runs_policy_id_foreign` FOREIGN KEY (`policy_id`) REFERENCES `featherpanel_node_backup_policies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `featherpanel_node_backup_run_items` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`run_id` INT(11) NOT NULL,
	`node_id` INT(11) NOT NULL,
	`status` ENUM('pending', 'created', 'uploaded', 'skipped', 'failed') NOT NULL DEFAULT 'pending',
	`backup_uuid` CHAR(36) DEFAULT NULL,
	`remote_path` VARCHAR(1024) DEFAULT NULL,
	`bytes` BIGINT DEFAULT NULL,
	`checksum` VARCHAR(128) DEFAULT NULL,
	`error` TEXT DEFAULT NULL,
	`started_at` TIMESTAMP NULL DEFAULT NULL,
	`completed_at` TIMESTAMP NULL DEFAULT NULL,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `node_backup_run_items_run_id_foreign` (`run_id`),
	KEY `node_backup_run_items_node_id_foreign` (`node_id`),
	KEY `node_backup_run_items_status_index` (`status`),
	CONSTRAINT `node_backup_run_items_run_id_foreign` FOREIGN KEY (`run_id`) REFERENCES `featherpanel_node_backup_runs` (`id`) ON DELETE CASCADE,
	CONSTRAINT `node_backup_run_items_node_id_foreign` FOREIGN KEY (`node_id`) REFERENCES `featherpanel_nodes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
