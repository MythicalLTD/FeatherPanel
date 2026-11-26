-- Admin webhooks: panel events (servers, users, backups, VDS, web hosting) sent to
-- outside URLs. Deliveries are queued and sent by the cron runner with retries.
CREATE TABLE IF NOT EXISTS `featherpanel_webhooks` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`url` VARCHAR(2048) NOT NULL,
	`secret` TEXT NOT NULL,
	`events` TEXT NOT NULL,
	`format` VARCHAR(16) NOT NULL DEFAULT 'json',
	`enabled` TINYINT(1) NOT NULL DEFAULT 1,
	`description` VARCHAR(255) DEFAULT NULL,
	`created_by_uuid` CHAR(36) DEFAULT NULL,
	`last_delivery_at` TIMESTAMP NULL DEFAULT NULL,
	`last_delivery_status` VARCHAR(16) DEFAULT NULL,
	`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `webhooks_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `featherpanel_webhook_deliveries` (
	`id` BIGINT(20) NOT NULL AUTO_INCREMENT,
	`webhook_id` INT(11) NOT NULL,
	`event_id` CHAR(36) NOT NULL,
	`event` VARCHAR(64) NOT NULL,
	`payload` MEDIUMTEXT NOT NULL,
	`status` VARCHAR(16) NOT NULL DEFAULT 'pending',
	`attempts` INT(11) NOT NULL DEFAULT 0,
	`max_attempts` INT(11) NOT NULL DEFAULT 5,
	`status_code` INT(11) DEFAULT NULL,
	`response_snippet` TEXT DEFAULT NULL,
	`error` VARCHAR(500) DEFAULT NULL,
	`duration_ms` INT(11) DEFAULT NULL,
	`next_retry_at` TIMESTAMP NULL DEFAULT NULL,
	`last_attempt_at` TIMESTAMP NULL DEFAULT NULL,
	`delivered_at` TIMESTAMP NULL DEFAULT NULL,
	`redelivery_of` BIGINT(20) DEFAULT NULL,
	`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `webhook_deliveries_due` (`status`, `next_retry_at`),
	KEY `webhook_deliveries_webhook` (`webhook_id`, `id`),
	KEY `webhook_deliveries_created_at` (`created_at`),
	CONSTRAINT `webhook_deliveries_webhook_fk` FOREIGN KEY (`webhook_id`) REFERENCES `featherpanel_webhooks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
