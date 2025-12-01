CREATE TABLE IF NOT EXISTS `featherpanel_images` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(191) NOT NULL,
    `url` varchar(191) NOT NULL,
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_name` (`name`),
    KEY `images_url_index` (`url`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;