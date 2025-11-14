CREATE TABLE
	IF NOT EXISTS `featherpanel_featherzerotrust_cron_logs` (
		`id` int (11) NOT NULL AUTO_INCREMENT,
		`execution_id` varchar(191) NOT NULL,
		`started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
		`completed_at` timestamp NULL DEFAULT NULL,
		`status` enum ('running', 'completed', 'failed') NOT NULL DEFAULT 'running',
		`total_servers_scanned` int (11) NOT NULL DEFAULT 0,
		`total_detections` int (11) NOT NULL DEFAULT 0,
		`total_errors` int (11) NOT NULL DEFAULT 0,
		`summary` text DEFAULT NULL,
		`details` longtext CHARACTER
		SET
			utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid (`details`)),
			`error_message` text DEFAULT NULL,
			`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
			`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY (`id`),
			UNIQUE KEY `unique_execution_id` (`execution_id`),
			KEY `featherzerotrust_cron_logs_started_at_index` (`started_at`),
			KEY `featherzerotrust_cron_logs_status_index` (`status`)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE
	IF NOT EXISTS `featherpanel_featherzerotrust_scan_logs` (
		`id` int (11) NOT NULL AUTO_INCREMENT,
		`execution_id` varchar(191) NOT NULL,
		`server_uuid` char(36) NOT NULL,
		`server_name` varchar(255) DEFAULT NULL,
		`node_id` int (11) DEFAULT NULL,
		`node_name` varchar(255) DEFAULT NULL,
		`status` enum ('completed', 'failed', 'skipped') NOT NULL DEFAULT 'completed',
		`files_scanned` int (11) NOT NULL DEFAULT 0,
		`detections_count` int (11) NOT NULL DEFAULT 0,
		`errors_count` int (11) NOT NULL DEFAULT 0,
		`duration_seconds` decimal(10, 2) DEFAULT NULL,
		`detections` longtext CHARACTER
		SET
			utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid (`detections`)),
			`error_message` text DEFAULT NULL,
			`scanned_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (`id`),
			KEY `featherzerotrust_scan_logs_execution_id_index` (`execution_id`),
			KEY `featherzerotrust_scan_logs_server_uuid_index` (`server_uuid`),
			KEY `featherzerotrust_scan_logs_scanned_at_index` (`scanned_at`),
			CONSTRAINT `featherzerotrust_scan_logs_execution_id_fk` FOREIGN KEY (`execution_id`) REFERENCES `featherpanel_featherzerotrust_cron_logs` (`execution_id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;