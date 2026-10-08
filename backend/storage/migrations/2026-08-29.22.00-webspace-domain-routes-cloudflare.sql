CREATE TABLE IF NOT EXISTS `featherpanel_webspace_domains` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`webspace_id` INT(11) NOT NULL,
	`domain` VARCHAR(253) NOT NULL,
	`type` ENUM('primary', 'alias', 'redirect') NOT NULL DEFAULT 'alias',
	`redirect_target` VARCHAR(512) DEFAULT NULL,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `featherpanel_webspace_domains_domain_unique` (`domain`),
	KEY `featherpanel_webspace_domains_webspace_id` (`webspace_id`),
	CONSTRAINT `fk_webspace_domains_webspace` FOREIGN KEY (`webspace_id`) REFERENCES `featherpanel_webspaces` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

ALTER TABLE `featherpanel_web_nodes`
	ADD COLUMN IF NOT EXISTS `cloudflare_api_token` TEXT DEFAULT NULL,
	ADD COLUMN IF NOT EXISTS `cloudflare_zone_id` VARCHAR(64) DEFAULT NULL;

ALTER TABLE `featherpanel_webspaces`
	ADD COLUMN IF NOT EXISTS `ssl_mode` VARCHAR(16) NOT NULL DEFAULT 'acme';
