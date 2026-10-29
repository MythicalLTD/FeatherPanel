-- Guarded with information_schema checks so it is safe to re-run and also works on MySQL 8.
-- Linked single sign-on identities (generic OIDC, Google, GitHub). One row per provider account,
-- unique on (provider, subject) so an outside account can only belong to one panel user.
CREATE TABLE IF NOT EXISTS `featherpanel_user_sso_identities` (
	`id` int (11) NOT NULL AUTO_INCREMENT,
	`user_id` int (11) NOT NULL,
	`provider` varchar(191) NOT NULL,
	`subject` varchar(191) NOT NULL,
	`email` varchar(255) DEFAULT NULL,
	`last_login_at` timestamp NULL DEFAULT NULL,
	`created_at` timestamp NOT NULL DEFAULT current_timestamp(),
	`updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
	PRIMARY KEY (`id`),
	UNIQUE KEY `user_sso_identities_provider_subject_unique` (`provider`, `subject`),
	KEY `user_sso_identities_user_id_foreign` (`user_id`),
	CONSTRAINT `user_sso_identities_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `featherpanel_users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- Carry over existing generic OIDC links stored on the users table.
INSERT IGNORE INTO `featherpanel_user_sso_identities` (`user_id`, `provider`, `subject`, `email`)
SELECT `id`, CONCAT('oidc:', `oidc_provider`), `oidc_subject`, `oidc_email`
FROM `featherpanel_users`
WHERE `oidc_provider` IS NOT NULL AND `oidc_provider` <> '' AND `oidc_subject` IS NOT NULL AND `oidc_subject` <> '';

-- Accounts created through SSO get a random password the user never saw; track that so the
-- last login method cannot be unlinked.
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_users' AND COLUMN_NAME = 'password_set') = 0,
	'ALTER TABLE `featherpanel_users` ADD COLUMN `password_set` ENUM(''false'', ''true'') NOT NULL DEFAULT ''true''',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
