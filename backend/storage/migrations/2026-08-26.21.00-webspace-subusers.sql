CREATE TABLE IF NOT EXISTS `featherpanel_webspace_subusers` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL,
    `webspace_id` int(11) NOT NULL,
    `permissions` json NOT NULL,
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `webspace_subusers_user_id_index` (`user_id`),
    KEY `webspace_subusers_webspace_id_index` (`webspace_id`),
    KEY `webspace_subusers_user_webspace_index` (`user_id`, `webspace_id`),
    KEY `webspace_subusers_created_at_index` (`created_at`),
    KEY `webspace_subusers_updated_at_index` (`updated_at`),
    UNIQUE KEY `webspace_subusers_user_webspace_unique` (`user_id`, `webspace_id`),
    CONSTRAINT `webspace_subusers_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `featherpanel_users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `webspace_subusers_webspace_id_foreign` FOREIGN KEY (`webspace_id`) REFERENCES `featherpanel_webspaces` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
