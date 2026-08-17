CREATE TABLE IF NOT EXISTS `featherpanel_command_snippets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL,
  `user_uuid` CHAR(36) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `command` TEXT NOT NULL,
  `eggs` JSON NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uuid` (`uuid`),
  KEY `user_uuid` (`user_uuid`),
  KEY `user_uuid_created_at_id` (`user_uuid`, `created_at`, `id`),
  FOREIGN KEY (`user_uuid`) REFERENCES `featherpanel_users` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
