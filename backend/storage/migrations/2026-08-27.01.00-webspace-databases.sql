ALTER TABLE `featherpanel_webspaces`
	ADD COLUMN `database_limit` INT(10) UNSIGNED NOT NULL DEFAULT 1 AFTER `disk`;

ALTER TABLE `featherpanel_databases`
	ADD COLUMN `web_node_id` INT(11) DEFAULT NULL AFTER `node_id`,
	ADD KEY `featherpanel_databases_web_node_id` (`web_node_id`),
	ADD CONSTRAINT `featherpanel_databases_web_node_id_foreign`
		FOREIGN KEY (`web_node_id`) REFERENCES `featherpanel_web_nodes` (`id`) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS `featherpanel_webspace_databases` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`webspace_id` INT(11) NOT NULL,
	`database_host_id` INT(11) NOT NULL,
	`database` VARCHAR(191) NOT NULL,
	`username` VARCHAR(191) NOT NULL,
	`password` VARCHAR(191) NOT NULL,
	`remote` VARCHAR(191) NOT NULL DEFAULT '%',
	`max_connections` INT(10) UNSIGNED NOT NULL DEFAULT 0,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `featherpanel_webspace_databases_name_unique` (`webspace_id`, `database`),
	KEY `featherpanel_webspace_databases_host_id` (`database_host_id`),
	CONSTRAINT `featherpanel_webspace_databases_webspace_id_foreign`
		FOREIGN KEY (`webspace_id`) REFERENCES `featherpanel_webspaces` (`id`) ON DELETE CASCADE,
	CONSTRAINT `featherpanel_webspace_databases_host_id_foreign`
		FOREIGN KEY (`database_host_id`) REFERENCES `featherpanel_databases` (`id`) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
