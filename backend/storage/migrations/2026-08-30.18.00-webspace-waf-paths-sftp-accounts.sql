ALTER TABLE `featherpanel_webspaces`
	ADD COLUMN IF NOT EXISTS `waf_deny_paths` TEXT NULL AFTER `waf_deny_ips`;

CREATE TABLE IF NOT EXISTS `featherpanel_webspace_sftp_accounts` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`webspace_id` INT(11) NOT NULL,
	`account_name` VARCHAR(32) NOT NULL,
	`password` TEXT NOT NULL,
	`home_relative` VARCHAR(255) NOT NULL DEFAULT '',
	`enabled` TINYINT(1) NOT NULL DEFAULT 1,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `featherpanel_webspace_sftp_accounts_name_unique` (`webspace_id`, `account_name`),
	CONSTRAINT `featherpanel_webspace_sftp_accounts_webspace_id_foreign`
		FOREIGN KEY (`webspace_id`) REFERENCES `featherpanel_webspaces` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
