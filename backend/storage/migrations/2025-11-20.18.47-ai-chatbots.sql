-- Chat Conversations Table
CREATE TABLE
	IF NOT EXISTS `featherpanel_chatbot_conversations` (
		`id` INT (11) NOT NULL AUTO_INCREMENT,
		`user_uuid` CHAR(36) NOT NULL,
		`title` VARCHAR(255) DEFAULT NULL,
		`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		KEY `conversations_user_uuid_index` (`user_uuid`),
		KEY `conversations_updated_at_index` (`updated_at`),
		CONSTRAINT `conversations_user_uuid_foreign` FOREIGN KEY (`user_uuid`) REFERENCES `featherpanel_users` (`uuid`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- Chat Messages Table
CREATE TABLE
	IF NOT EXISTS `featherpanel_chatbot_messages` (
		`id` INT (11) NOT NULL AUTO_INCREMENT,
		`conversation_id` INT (11) NOT NULL,
		`role` ENUM ('user', 'assistant') NOT NULL,
		`content` TEXT NOT NULL,
		`model` VARCHAR(255) DEFAULT NULL,
		`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		KEY `messages_conversation_id_index` (`conversation_id`),
		KEY `messages_created_at_index` (`created_at`),
		CONSTRAINT `messages_conversation_id_foreign` FOREIGN KEY (`conversation_id`) REFERENCES `featherpanel_chatbot_conversations` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;