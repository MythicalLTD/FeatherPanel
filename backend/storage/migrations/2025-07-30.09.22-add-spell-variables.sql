CREATE TABLE
	IF NOT EXISTS `mythicalpanel_spell_variables` (
		`id` int (11) NOT NULL AUTO_INCREMENT,
		`spell_id` int (11) NOT NULL,
		`name` varchar(191) NOT NULL,
		`description` text NOT NULL,
		`env_variable` varchar(191) NOT NULL,
		`default_value` text NOT NULL,
		`user_viewable` tinyint (1) NOT NULL DEFAULT 1,
		`user_editable` tinyint (1) NOT NULL DEFAULT 1,
		`rules` text DEFAULT NULL,
		`field_type` varchar(191) NOT NULL DEFAULT 'text',
		`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		KEY `spell_variables_spell_id_foreign` (`spell_id`),
		CONSTRAINT `spell_variables_spell_id_foreign` FOREIGN KEY (`spell_id`) REFERENCES `mythicalpanel_spells` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;