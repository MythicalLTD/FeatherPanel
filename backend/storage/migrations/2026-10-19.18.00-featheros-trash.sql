CREATE TABLE IF NOT EXISTS `featherpanel_featheros_trash` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `uuid` CHAR(36) NOT NULL,
    `user_id` INT(11) NOT NULL,
    `server_id` INT(11) NOT NULL,
    `server_uuid_short` VARCHAR(8) NOT NULL,
    `original_root` VARCHAR(1024) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `is_directory` TINYINT(1) NOT NULL DEFAULT 0,
    `size` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `deleted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `featheros_trash_uuid` (`uuid`),
    KEY `featheros_trash_user` (`user_id`),
    KEY `featheros_trash_server` (`server_id`),
    CONSTRAINT `featheros_trash_user_fk` FOREIGN KEY (`user_id`) REFERENCES `featherpanel_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
