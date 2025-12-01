-- Subdomain Manager Domains
-- Stores allowed domains for automatic subdomain provisioning
CREATE TABLE
	IF NOT EXISTS `featherpanel_subdomain_manager_domains` (
		`id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
		`uuid` CHAR(36) NOT NULL,
		`domain` VARCHAR(255) NOT NULL,
		`description` VARCHAR(255) DEFAULT NULL,
		`is_active` TINYINT (1) NOT NULL DEFAULT 1,
		`cloudflare_zone_id` VARCHAR(64) DEFAULT NULL,
		`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		UNIQUE KEY `subdomain_manager_domains_uuid_unique` (`uuid`),
		UNIQUE KEY `subdomain_manager_domains_domain_unique` (`domain`),
		KEY `subdomain_manager_domains_is_active_index` (`is_active`)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Subdomain Manager Domain ↔ Spell mapping
-- Associates domains with spells and their SRV/CNAME protocol configuration
CREATE TABLE
	IF NOT EXISTS `featherpanel_subdomain_manager_domain_spells` (
		`id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
		`domain_id` INT UNSIGNED NOT NULL,
		`spell_id` INT NOT NULL,
		`protocol_service` VARCHAR(64) DEFAULT NULL,
		`protocol_type` VARCHAR(32) DEFAULT 'tcp',
		`priority` TINYINT UNSIGNED NOT NULL DEFAULT 1,
		`weight` TINYINT UNSIGNED NOT NULL DEFAULT 1,
		`ttl` INT UNSIGNED NOT NULL DEFAULT 120,
		`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		UNIQUE KEY `subdomain_manager_domain_spell_unique` (`domain_id`, `spell_id`),
		KEY `subdomain_manager_domain_spells_spell_id_foreign` (`spell_id`),
		CONSTRAINT `subdomain_manager_domain_spells_domain_id_foreign` FOREIGN KEY (`domain_id`) REFERENCES `featherpanel_subdomain_manager_domains` (`id`) ON DELETE CASCADE,
		CONSTRAINT `subdomain_manager_domain_spells_spell_id_foreign` FOREIGN KEY (`spell_id`) REFERENCES `featherpanel_spells` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Subdomain Manager Subdomains
-- Tracks subdomains created by servers and links to Cloudflare records
CREATE TABLE
	IF NOT EXISTS `featherpanel_subdomain_manager_subdomains` (
		`id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
		`uuid` CHAR(36) NOT NULL,
		`server_id` INT NOT NULL,
		`domain_id` INT UNSIGNED NOT NULL,
		`spell_id` INT NOT NULL,
		`subdomain` VARCHAR(255) NOT NULL,
		`record_type` ENUM ('CNAME', 'SRV') NOT NULL DEFAULT 'CNAME',
		`port` INT NULL,
		`cloudflare_record_id` VARCHAR(128) DEFAULT NULL,
		`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		UNIQUE KEY `subdomain_manager_subdomains_uuid_unique` (`uuid`),
		UNIQUE KEY `subdomain_manager_subdomains_domain_subdomain_unique` (`domain_id`, `subdomain`),
		KEY `subdomain_manager_subdomains_server_id_foreign` (`server_id`),
		KEY `subdomain_manager_subdomains_spell_id_foreign` (`spell_id`),
		CONSTRAINT `subdomain_manager_subdomains_server_id_foreign` FOREIGN KEY (`server_id`) REFERENCES `featherpanel_servers` (`id`) ON DELETE CASCADE,
		CONSTRAINT `subdomain_manager_subdomains_domain_id_foreign` FOREIGN KEY (`domain_id`) REFERENCES `featherpanel_subdomain_manager_domains` (`id`) ON DELETE CASCADE,
		CONSTRAINT `subdomain_manager_subdomains_spell_id_foreign` FOREIGN KEY (`spell_id`) REFERENCES `featherpanel_spells` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;