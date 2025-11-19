CREATE TABLE
    IF NOT EXISTS `featherpanel_notifications` (
        `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        `title` VARCHAR(255) NOT NULL,
        `message_markdown` TEXT NOT NULL,
        `type` VARCHAR(32) NOT NULL DEFAULT 'info', -- e.g. info, warning, danger, success, etc
        `is_dismissible` BOOLEAN NOT NULL DEFAULT TRUE,
        `is_sticky` BOOLEAN NOT NULL DEFAULT FALSE, -- if true stays until user explicitly closes
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `featherpanel_notifications_type_index` (`type`)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;