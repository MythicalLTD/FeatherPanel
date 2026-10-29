-- Node health monitor: the last known state per node (written by the node health cron)
-- and the alert history (node down, disk nearly full, backup failed) with resolve times.
CREATE TABLE IF NOT EXISTS `featherpanel_node_health` (
	`node_id` int (11) NOT NULL,
	`online` tinyint (1) NOT NULL DEFAULT 0,
	`consecutive_failures` int (11) NOT NULL DEFAULT 0,
	`last_seen_at` timestamp NULL DEFAULT NULL,
	`last_checked_at` timestamp NULL DEFAULT NULL,
	`last_error` varchar(500) DEFAULT NULL,
	`cpu_percent` decimal(6, 2) DEFAULT NULL,
	`memory_used` bigint (20) UNSIGNED DEFAULT NULL,
	`memory_total` bigint (20) UNSIGNED DEFAULT NULL,
	`disk_used` bigint (20) UNSIGNED DEFAULT NULL,
	`disk_total` bigint (20) UNSIGNED DEFAULT NULL,
	`updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
	PRIMARY KEY (`node_id`),
	CONSTRAINT `node_health_node_id_foreign` FOREIGN KEY (`node_id`) REFERENCES `featherpanel_nodes` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `featherpanel_node_alerts` (
	`id` int (11) NOT NULL AUTO_INCREMENT,
	`node_id` int (11) DEFAULT NULL,
	`type` varchar(32) NOT NULL,
	`fingerprint` varchar(191) NOT NULL,
	`severity` varchar(16) NOT NULL DEFAULT 'warning',
	`status` varchar(16) NOT NULL DEFAULT 'open',
	`message` varchar(500) NOT NULL,
	`details` text DEFAULT NULL,
	`occurrences` int (11) NOT NULL DEFAULT 1,
	`last_notified_at` timestamp NULL DEFAULT NULL,
	`resolved_at` timestamp NULL DEFAULT NULL,
	`created_at` timestamp NOT NULL DEFAULT current_timestamp(),
	`updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
	PRIMARY KEY (`id`),
	KEY `node_alerts_fingerprint_status` (`fingerprint`, `status`),
	KEY `node_alerts_node_id` (`node_id`),
	KEY `node_alerts_created_at` (`created_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- Failed backups are picked up incrementally; index the lookup.
ALTER TABLE `featherpanel_server_backups`
	ADD INDEX IF NOT EXISTS `server_backups_completed_success` (`completed_at`, `is_successful`);
