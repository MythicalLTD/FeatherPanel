CREATE TABLE
	IF NOT EXISTS `featherpanel_knowledgebase_categories` (
		`id` INT (11) NOT NULL AUTO_INCREMENT,
		`name` VARCHAR(255) NOT NULL,
		`slug` VARCHAR(255) NOT NULL,
		`icon` VARCHAR(255) NOT NULL,
		`description` TEXT DEFAULT NULL,
		`position` INT (11) NOT NULL DEFAULT 0,
		`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		UNIQUE KEY `knowledgebase_categories_slug_unique` (`slug`)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE
	IF NOT EXISTS `featherpanel_knowledgebase_articles` (
		`id` INT (11) NOT NULL AUTO_INCREMENT,
		`category_id` INT (11) NOT NULL,
		`title` VARCHAR(255) NOT NULL,
		`slug` VARCHAR(255) NOT NULL,
		`content` TEXT NOT NULL,
		`author_id` INT (11) NOT NULL,
		`status` ENUM ('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
		`pinned` ENUM ('false', 'true') NOT NULL DEFAULT 'false',
		`published_at` TIMESTAMP NULL DEFAULT NULL,
		`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		UNIQUE KEY `knowledgebase_articles_slug_unique` (`slug`),
		KEY `knowledgebase_articles_category_id_foreign` (`category_id`),
		KEY `knowledgebase_articles_author_id_foreign` (`author_id`),
		KEY `knowledgebase_articles_status_index` (`status`),
		KEY `knowledgebase_articles_pinned_index` (`pinned`),
		CONSTRAINT `knowledgebase_articles_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `featherpanel_knowledgebase_categories` (`id`) ON DELETE CASCADE,
		CONSTRAINT `knowledgebase_articles_author_id_foreign` FOREIGN KEY (`author_id`) REFERENCES `featherpanel_users` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE
	IF NOT EXISTS `featherpanel_knowledgebase_articles_tags` (
		`id` INT (11) NOT NULL AUTO_INCREMENT,
		`article_id` INT (11) NOT NULL,
		`tag_name` VARCHAR(255) NOT NULL,
		`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		KEY `knowledgebase_articles_tags_article_id_foreign` (`article_id`),
		KEY `knowledgebase_articles_tags_tag_name_index` (`tag_name`),
		CONSTRAINT `knowledgebase_articles_tags_article_id_foreign` FOREIGN KEY (`article_id`) REFERENCES `featherpanel_knowledgebase_articles` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE
	IF NOT EXISTS `featherpanel_knowledgebase_articles_attachments` (
		`id` INT (11) NOT NULL AUTO_INCREMENT,
		`article_id` INT (11) NOT NULL,
		`file_name` VARCHAR(255) NOT NULL,
		`file_path` VARCHAR(255) NOT NULL,
		`file_size` INT (11) NOT NULL,
		`file_type` VARCHAR(255) NOT NULL,
		`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		KEY `knowledgebase_articles_attachments_article_id_foreign` (`article_id`),
		CONSTRAINT `knowledgebase_articles_attachments_article_id_foreign` FOREIGN KEY (`article_id`) REFERENCES `featherpanel_knowledgebase_articles` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;