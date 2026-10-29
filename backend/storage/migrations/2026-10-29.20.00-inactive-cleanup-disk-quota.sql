-- Inactive server cleanup: per-server exemption and the cleanup stage (warned, suspended,
-- archiving, archive_failed), plus archives kept after a server is removed.
-- Per-user disk quota: an override in MiB (NULL = use the panel default, 0 = unlimited).
ALTER TABLE `featherpanel_servers`
	ADD COLUMN IF NOT EXISTS `inactivity_exempt` tinyint (1) NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS `inactivity_stage` varchar(20) DEFAULT NULL,
	ADD COLUMN IF NOT EXISTS `inactivity_stage_at` timestamp NULL DEFAULT NULL,
	ADD COLUMN IF NOT EXISTS `inactivity_backup_id` int (11) DEFAULT NULL;

ALTER TABLE `featherpanel_users`
	ADD COLUMN IF NOT EXISTS `disk_quota_mb` int (11) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS `featherpanel_server_archives` (
	`id` int (11) NOT NULL AUTO_INCREMENT,
	`server_uuid` char(36) NOT NULL,
	`server_name` varchar(191) NOT NULL,
	`owner_id` int (11) DEFAULT NULL,
	`node_id` int (11) DEFAULT NULL,
	`spell_id` int (11) DEFAULT NULL,
	`backup_uuid` char(36) NOT NULL,
	`backup_disk` varchar(32) NOT NULL,
	`remote_ref` varchar(500) DEFAULT NULL,
	`bytes` bigint (20) UNSIGNED DEFAULT NULL,
	`checksum` varchar(191) DEFAULT NULL,
	`server_snapshot` mediumtext DEFAULT NULL,
	`last_activity_at` timestamp NULL DEFAULT NULL,
	`created_at` timestamp NOT NULL DEFAULT current_timestamp(),
	PRIMARY KEY (`id`),
	KEY `server_archives_owner_index` (`owner_id`),
	KEY `server_archives_created_index` (`created_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
