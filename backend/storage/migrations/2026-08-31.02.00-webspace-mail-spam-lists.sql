ALTER TABLE `featherpanel_webspace_mailboxes`
	ADD COLUMN `spam_filter_enabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `autorespond_body`;

CREATE TABLE IF NOT EXISTS `featherpanel_webspace_mailing_lists` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`webspace_id` INT(11) NOT NULL,
	`mail_host_id` INT(11) NOT NULL,
	`list_local` VARCHAR(64) NOT NULL,
	`domain` VARCHAR(191) NOT NULL,
	`member` VARCHAR(255) NOT NULL,
	`enabled` TINYINT(1) NOT NULL DEFAULT 1,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `featherpanel_webspace_mailing_lists_unique` (`webspace_id`, `list_local`, `domain`, `member`),
	KEY `featherpanel_webspace_mailing_lists_host_id` (`mail_host_id`),
	CONSTRAINT `featherpanel_webspace_mailing_lists_webspace_id_foreign`
		FOREIGN KEY (`webspace_id`) REFERENCES `featherpanel_webspaces` (`id`) ON DELETE CASCADE,
	CONSTRAINT `featherpanel_webspace_mailing_lists_host_id_foreign`
		FOREIGN KEY (`mail_host_id`) REFERENCES `featherpanel_mail_hosts` (`id`) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
