CREATE TABLE IF NOT EXISTS `featherpanel_alt_detection_resets` (
    `user_uuid` VARCHAR(36) NOT NULL,
    `reset_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
