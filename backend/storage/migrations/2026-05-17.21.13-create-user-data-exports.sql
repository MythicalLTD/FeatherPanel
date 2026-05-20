CREATE TABLE IF NOT EXISTS `featherpanel_user_data_exports` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `uuid` CHAR(36) NOT NULL,
    `user_uuid` CHAR(36) NOT NULL,
    `ticket_id` INT(11) NOT NULL,
    `status` ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    `attempts` INT(11) NOT NULL DEFAULT 0,
    `file_path` VARCHAR(255) DEFAULT NULL,
    `error_message` TEXT DEFAULT NULL,
    `requested_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `processing_started_at` TIMESTAMP NULL DEFAULT NULL,
    `processed_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `user_data_exports_uuid_unique` (`uuid`),
    KEY `user_data_exports_user_uuid_index` (`user_uuid`),
    KEY `user_data_exports_ticket_id_index` (`ticket_id`),
    KEY `user_data_exports_status_index` (`status`),
    KEY `user_data_exports_requested_at_index` (`requested_at`),
    CONSTRAINT `user_data_exports_user_uuid_foreign`
        FOREIGN KEY (`user_uuid`)
        REFERENCES `featherpanel_users` (`uuid`)
        ON DELETE CASCADE,
    CONSTRAINT `user_data_exports_ticket_id_foreign`
        FOREIGN KEY (`ticket_id`)
        REFERENCES `featherpanel_tickets` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
