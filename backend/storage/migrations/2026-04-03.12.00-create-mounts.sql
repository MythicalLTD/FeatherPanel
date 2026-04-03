CREATE TABLE IF NOT EXISTS `featherpanel_mounts` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`uuid` CHAR(36) NOT NULL,
	`name` VARCHAR(191) NOT NULL,
	`description` TEXT DEFAULT NULL,
	`source` VARCHAR(4096) NOT NULL,
	`target` VARCHAR(4096) NOT NULL,
	`read_only` TINYINT(1) NOT NULL DEFAULT 0,
	`user_mountable` TINYINT(1) NOT NULL DEFAULT 1,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `mounts_uuid_unique` (`uuid`),
	UNIQUE KEY `mounts_name_unique` (`name`),
	KEY `mounts_read_only_index` (`read_only`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `featherpanel_mountables` (
	`mount_id` INT(11) NOT NULL,
	`mountable_type` VARCHAR(32) NOT NULL,
	`mountable_id` INT(11) NOT NULL,
	PRIMARY KEY (`mount_id`, `mountable_type`, `mountable_id`),
	KEY `mountables_lookup_index` (`mountable_type`, `mountable_id`),
	CONSTRAINT `mountables_mount_id_foreign`
		FOREIGN KEY (`mount_id`)
		REFERENCES `featherpanel_mounts` (`id`)
		ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
