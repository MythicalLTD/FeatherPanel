CREATE TABLE IF NOT EXISTS `featherpanel_server_subusers` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL,
    `server_id` int(11) NOT NULL,
    `permissions` json NOT NULL,
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `server_subusers_user_id_index` (`user_id`),
    KEY `server_subusers_server_id_index` (`server_id`),
    KEY `server_subusers_user_server_index` (`user_id`, `server_id`),
    KEY `server_subusers_created_at_index` (`created_at`),
    KEY `server_subusers_updated_at_index` (`updated_at`),
    CONSTRAINT `server_subusers_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `featherpanel_users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `server_subusers_server_id_foreign` FOREIGN KEY (`server_id`) REFERENCES `featherpanel_servers` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;