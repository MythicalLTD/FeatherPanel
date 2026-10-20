CREATE TABLE IF NOT EXISTS `featherpanel_featheros_states` (
	`user_id` INT (11) NOT NULL,
	`state` MEDIUMTEXT NOT NULL,
	`revision` INT UNSIGNED NOT NULL DEFAULT 1,
	`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`user_id`),
	CONSTRAINT `fk_featheros_state_user` FOREIGN KEY (`user_id`) REFERENCES `featherpanel_users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `featherpanel_featheros_notes` (
	`id` INT (11) NOT NULL AUTO_INCREMENT,
	`user_id` INT (11) NOT NULL,
	`title` VARCHAR(191) NOT NULL DEFAULT '',
	`content` MEDIUMTEXT NOT NULL,
	`color` VARCHAR(16) NOT NULL DEFAULT 'yellow',
	`pinned` TINYINT (1) NOT NULL DEFAULT 0,
	`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `idx_featheros_notes_user` (`user_id`, `pinned`, `updated_at`),
	CONSTRAINT `fk_featheros_note_user` FOREIGN KEY (`user_id`) REFERENCES `featherpanel_users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
