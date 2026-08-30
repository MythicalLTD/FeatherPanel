CREATE TABLE IF NOT EXISTS `featherpanel_dns_hosts` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`name` VARCHAR(191) NOT NULL,
	`provider` VARCHAR(32) NOT NULL DEFAULT 'cloudflare',
	`credentials` TEXT NOT NULL,
	`account_id` VARCHAR(64) DEFAULT NULL,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `featherpanel_dns_hosts_provider` (`provider`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `featherpanel_webspace_dns_zones` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`webspace_id` INT(11) NOT NULL,
	`dns_host_id` INT(11) NOT NULL,
	`zone_name` VARCHAR(191) NOT NULL,
	`provider_zone_id` VARCHAR(64) NOT NULL,
	`is_primary` TINYINT(1) NOT NULL DEFAULT 0,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `featherpanel_webspace_dns_zones_zone_name_unique` (`zone_name`),
	KEY `featherpanel_webspace_dns_zones_webspace_id` (`webspace_id`),
	KEY `featherpanel_webspace_dns_zones_dns_host_id` (`dns_host_id`),
	CONSTRAINT `featherpanel_webspace_dns_zones_webspace_id_foreign`
		FOREIGN KEY (`webspace_id`) REFERENCES `featherpanel_webspaces` (`id`) ON DELETE CASCADE,
	CONSTRAINT `featherpanel_webspace_dns_zones_dns_host_id_foreign`
		FOREIGN KEY (`dns_host_id`) REFERENCES `featherpanel_dns_hosts` (`id`) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
