CREATE TABLE IF NOT EXISTS `featherpanel_backup_policies` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`uuid` CHAR(36) NOT NULL,
	`name` VARCHAR(191) NOT NULL,
	`scope_type` ENUM('servers', 'node', 'all') NOT NULL DEFAULT 'servers',
	`node_id` INT(11) DEFAULT NULL,
	`cron_day_of_week` VARCHAR(191) NOT NULL,
	`cron_month` VARCHAR(191) NOT NULL,
	`cron_day_of_month` VARCHAR(191) NOT NULL,
	`cron_hour` VARCHAR(191) NOT NULL,
	`cron_minute` VARCHAR(191) NOT NULL,
	`timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC',
	`is_active` TINYINT(1) NOT NULL DEFAULT 1,
	`is_processing` TINYINT(1) NOT NULL DEFAULT 0,
	`only_when_online` TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
	`backup_payload` TEXT NOT NULL,
	`concurrency` TINYINT(3) UNSIGNED NOT NULL DEFAULT 2,
	`notify_on_failure` TINYINT(1) NOT NULL DEFAULT 1,
	`last_run_at` TIMESTAMP NULL DEFAULT NULL,
	`next_run_at` TIMESTAMP NULL DEFAULT NULL,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `backup_policies_uuid_unique` (`uuid`),
	KEY `backup_policies_scope_type_index` (`scope_type`),
	KEY `backup_policies_node_id_foreign` (`node_id`),
	KEY `backup_policies_is_active_next_run_index` (`is_active`, `next_run_at`),
	KEY `backup_policies_is_processing_index` (`is_processing`),
	CONSTRAINT `backup_policies_node_id_foreign` FOREIGN KEY (`node_id`) REFERENCES `featherpanel_nodes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `featherpanel_backup_policy_servers` (
	`policy_id` INT(11) NOT NULL,
	`server_id` INT(11) NOT NULL,
	PRIMARY KEY (`policy_id`, `server_id`),
	KEY `backup_policy_servers_server_id_foreign` (`server_id`),
	CONSTRAINT `backup_policy_servers_policy_id_foreign` FOREIGN KEY (`policy_id`) REFERENCES `featherpanel_backup_policies` (`id`) ON DELETE CASCADE,
	CONSTRAINT `backup_policy_servers_server_id_foreign` FOREIGN KEY (`server_id`) REFERENCES `featherpanel_servers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `featherpanel_backup_policy_runs` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`policy_id` INT(11) NOT NULL,
	`status` ENUM('pending', 'running', 'completed', 'failed', 'partial') NOT NULL DEFAULT 'pending',
	`servers_total` INT(11) NOT NULL DEFAULT 0,
	`servers_ok` INT(11) NOT NULL DEFAULT 0,
	`servers_failed` INT(11) NOT NULL DEFAULT 0,
	`servers_skipped` INT(11) NOT NULL DEFAULT 0,
	`started_at` TIMESTAMP NULL DEFAULT NULL,
	`completed_at` TIMESTAMP NULL DEFAULT NULL,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `backup_policy_runs_policy_id_foreign` (`policy_id`),
	KEY `backup_policy_runs_status_index` (`status`),
	CONSTRAINT `backup_policy_runs_policy_id_foreign` FOREIGN KEY (`policy_id`) REFERENCES `featherpanel_backup_policies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `featherpanel_backup_policy_run_items` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`run_id` INT(11) NOT NULL,
	`server_id` INT(11) NOT NULL,
	`status` ENUM('pending', 'created', 'skipped', 'failed') NOT NULL DEFAULT 'pending',
	`reason` VARCHAR(191) DEFAULT NULL,
	`backup_uuid` CHAR(36) DEFAULT NULL,
	`error` TEXT DEFAULT NULL,
	`started_at` TIMESTAMP NULL DEFAULT NULL,
	`completed_at` TIMESTAMP NULL DEFAULT NULL,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `backup_policy_run_items_run_id_foreign` (`run_id`),
	KEY `backup_policy_run_items_server_id_foreign` (`server_id`),
	KEY `backup_policy_run_items_status_index` (`status`),
	CONSTRAINT `backup_policy_run_items_run_id_foreign` FOREIGN KEY (`run_id`) REFERENCES `featherpanel_backup_policy_runs` (`id`) ON DELETE CASCADE,
	CONSTRAINT `backup_policy_run_items_server_id_foreign` FOREIGN KEY (`server_id`) REFERENCES `featherpanel_servers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
