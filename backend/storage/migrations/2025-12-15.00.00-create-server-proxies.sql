-- Server Proxies Table
-- Stores reverse proxy configurations for servers
CREATE TABLE
	IF NOT EXISTS `featherpanel_server_proxies` (
		`id` INT NOT NULL AUTO_INCREMENT,
		`server_id` INT NOT NULL,
		`domain` VARCHAR(255) NOT NULL,
		`ip` VARCHAR(45) NOT NULL,
		`port` INT NOT NULL,
		`ssl` TINYINT (1) NOT NULL DEFAULT 0,
		`use_lets_encrypt` TINYINT (1) NOT NULL DEFAULT 0,
		`client_email` VARCHAR(255) NULL,
		`ssl_cert` TEXT NULL,
		`ssl_key` TEXT NULL,
		`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		KEY `server_proxies_server_id_index` (`server_id`),
		KEY `server_proxies_domain_index` (`domain`),
		KEY `server_proxies_port_index` (`port`),
		KEY `server_proxies_created_at_index` (`created_at`),
		KEY `server_proxies_updated_at_index` (`updated_at`),
		UNIQUE KEY `server_proxies_server_domain_port_unique` (`server_id`, `domain`, `port`),
		CONSTRAINT `server_proxies_server_id_foreign` FOREIGN KEY (`server_id`) REFERENCES `featherpanel_servers` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;