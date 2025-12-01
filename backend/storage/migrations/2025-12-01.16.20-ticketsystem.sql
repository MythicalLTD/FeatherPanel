CREATE TABLE
	IF NOT EXISTS `featherpanel_ticket_categories` (
		`id` INT (11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
	`icon` TEXT DEFAULT NULL,
	`color` VARCHAR(255) NOT NULL DEFAULT '#000000',
	`support_email` VARCHAR(255) NOT NULL DEFAULT '',
	`open_hours` TEXT DEFAULT NULL,
    `description` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ticket_categories_name_index` (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE
	IF NOT EXISTS `featherpanel_ticket_priorities` (
		`id` INT (11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `color` VARCHAR(255) NOT NULL DEFAULT '#000000',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ticket_priorities_name_index` (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT INTO
	`featherpanel_ticket_priorities` (`name`, `color`)
VALUES
('Low', '#00FF00'),
('Medium', '#FFFF00'),
('High', '#FF0000');

CREATE TABLE
	IF NOT EXISTS `featherpanel_ticket_statuses` (
		`id` INT (11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `color` VARCHAR(255) NOT NULL DEFAULT '#000000',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ticket_statuses_name_index` (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT INTO
	`featherpanel_ticket_statuses` (`name`, `color`)
VALUES
('Open', '#00FF00'),
('In Progress', '#FFFF00'),
('Closed', '#FF0000');

CREATE TABLE
	IF NOT EXISTS `featherpanel_tickets` (
		`id` INT (11) NOT NULL AUTO_INCREMENT,
		`uuid` CHAR(36) NOT NULL,
    `user_uuid` CHAR(36) NOT NULL,
		`server_id` INT (11) DEFAULT NULL,
		`category_id` INT (11) NOT NULL,
		`priority_id` INT (11) NOT NULL,
		`status_id` INT (11) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
		`closed_at` TIMESTAMP NULL DEFAULT NULL,
		`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		UNIQUE KEY `tickets_uuid_unique` (`uuid`),
		KEY `tickets_user_uuid_foreign` (`user_uuid`),
		KEY `tickets_server_id_foreign` (`server_id`),
		KEY `tickets_category_id_foreign` (`category_id`),
		KEY `tickets_priority_id_foreign` (`priority_id`),
		KEY `tickets_status_id_foreign` (`status_id`),
		KEY `tickets_created_at_index` (`created_at`),
		KEY `tickets_updated_at_index` (`updated_at`),
		CONSTRAINT `tickets_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `featherpanel_ticket_categories` (`id`) ON DELETE RESTRICT,
		CONSTRAINT `tickets_priority_id_foreign` FOREIGN KEY (`priority_id`) REFERENCES `featherpanel_ticket_priorities` (`id`) ON DELETE RESTRICT,
		CONSTRAINT `tickets_status_id_foreign` FOREIGN KEY (`status_id`) REFERENCES `featherpanel_ticket_statuses` (`id`) ON DELETE RESTRICT,
		CONSTRAINT `tickets_user_uuid_foreign` FOREIGN KEY (`user_uuid`) REFERENCES `featherpanel_users` (`uuid`) ON DELETE CASCADE,
		CONSTRAINT `tickets_server_id_foreign` FOREIGN KEY (`server_id`) REFERENCES `featherpanel_servers` (`id`) ON DELETE SET NULL
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE
	IF NOT EXISTS `featherpanel_ticket_messages` (
		`id` INT (11) NOT NULL AUTO_INCREMENT,
		`ticket_id` INT (11) NOT NULL,
		`user_uuid` CHAR(36) DEFAULT NULL,
		`message` TEXT NOT NULL,
		`is_internal` TINYINT (1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
		KEY `ticket_messages_ticket_id_foreign` (`ticket_id`),
		KEY `ticket_messages_user_uuid_foreign` (`user_uuid`),
		KEY `ticket_messages_is_internal_index` (`is_internal`),
		KEY `ticket_messages_created_at_index` (`created_at`),
		CONSTRAINT `ticket_messages_ticket_id_foreign` FOREIGN KEY (`ticket_id`) REFERENCES `featherpanel_tickets` (`id`) ON DELETE CASCADE,
		CONSTRAINT `ticket_messages_user_uuid_foreign` FOREIGN KEY (`user_uuid`) REFERENCES `featherpanel_users` (`uuid`) ON DELETE SET NULL
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE
	IF NOT EXISTS `featherpanel_ticket_attachments` (
		`id` INT (11) NOT NULL AUTO_INCREMENT,
		`ticket_id` INT (11) DEFAULT NULL,
		`message_id` INT (11) DEFAULT NULL,
		`file_name` VARCHAR(255) NOT NULL,
		`file_path` VARCHAR(255) NOT NULL,
		`file_size` INT (11) NOT NULL,
		`file_type` VARCHAR(255) NOT NULL,
		`user_downloadable` TINYINT (1) NOT NULL DEFAULT 1,
		`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		KEY `ticket_attachments_ticket_id_foreign` (`ticket_id`),
		KEY `ticket_attachments_message_id_foreign` (`message_id`),
		KEY `ticket_attachments_user_downloadable_index` (`user_downloadable`),
		CONSTRAINT `ticket_attachments_ticket_id_foreign` FOREIGN KEY (`ticket_id`) REFERENCES `featherpanel_tickets` (`id`) ON DELETE CASCADE,
		CONSTRAINT `ticket_attachments_message_id_foreign` FOREIGN KEY (`message_id`) REFERENCES `featherpanel_ticket_messages` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;