CREATE TABLE IF NOT EXISTS `featherpanel_blocked_ips` (
	`id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
	`ip` VARCHAR(64) NOT NULL COMMENT 'IPv4/IPv6 address or CIDR rule',
	`reason` TEXT NULL DEFAULT NULL,
	`expires_at` DATETIME NULL DEFAULT NULL COMMENT 'NULL = permanent ban',
	`created_by_uuid` CHAR(36) NULL DEFAULT NULL,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `featherpanel_blocked_ips_ip_unique` (`ip`),
	KEY `featherpanel_blocked_ips_expires_at_index` (`expires_at`),
	KEY `featherpanel_blocked_ips_created_by_uuid_index` (`created_by_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Panel IP bans that block new account registration';
