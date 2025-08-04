CREATE TABLE
	IF NOT EXISTS `mythicalpanel_databases` (
		`id` INT (11) NOT NULL AUTO_INCREMENT,
		`name` VARCHAR(255) NOT NULL,
		`node_id` INT (11) NOT NULL,
		`database_type` ENUM ('mysql', 'postgresql', 'mariadb', 'mongodb', 'redis') NOT NULL DEFAULT 'mysql',
		`database_port` INT (11) NOT NULL,
		`database_username` VARCHAR(255) NOT NULL,
		`database_password` VARCHAR(255) NOT NULL,
		`database_host` VARCHAR(255) NOT NULL,
		`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		KEY `mythicalpanel_databases_node_id_foreign` (`node_id`),
		CONSTRAINT `mythicalpanel_databases_node_id_foreign` FOREIGN KEY (`node_id`) REFERENCES `mythicalpanel_nodes` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;