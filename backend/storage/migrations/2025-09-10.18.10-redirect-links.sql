CREATE TABLE
	IF NOT EXISTS `featherpanel_redirect_links` (
		`id` int (11) NOT NULL AUTO_INCREMENT,
		`name` varchar(191) NOT NULL,
		`slug` varchar(191) NOT NULL,
		`url` varchar(191) NOT NULL,
		`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		UNIQUE KEY `unique_name` (`name`),
		UNIQUE KEY `unique_slug` (`slug`),
		KEY `redirect_links_url_index` (`url`)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;