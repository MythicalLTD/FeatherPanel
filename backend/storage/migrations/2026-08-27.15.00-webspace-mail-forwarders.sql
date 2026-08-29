ALTER TABLE `featherpanel_webspace_mailboxes`
	ADD COLUMN `autorespond_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `enabled`,
	ADD COLUMN `autorespond_subject` VARCHAR(255) NULL DEFAULT NULL AFTER `autorespond_enabled`,
	ADD COLUMN `autorespond_body` TEXT NULL AFTER `autorespond_subject`;

CREATE TABLE IF NOT EXISTS `featherpanel_webspace_mail_forwarders` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`webspace_id` INT(11) NOT NULL,
	`mail_host_id` INT(11) NOT NULL,
	`source_local` VARCHAR(64) NOT NULL,
	`domain` VARCHAR(191) NOT NULL,
	`destination` VARCHAR(255) NOT NULL,
	`enabled` TINYINT(1) NOT NULL DEFAULT 1,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `featherpanel_webspace_mail_forwarders_unique` (`webspace_id`, `source_local`, `domain`, `destination`),
	KEY `featherpanel_webspace_mail_forwarders_host_id` (`mail_host_id`),
	CONSTRAINT `featherpanel_webspace_mail_forwarders_webspace_id_foreign`
		FOREIGN KEY (`webspace_id`) REFERENCES `featherpanel_webspaces` (`id`) ON DELETE CASCADE,
	CONSTRAINT `featherpanel_webspace_mail_forwarders_host_id_foreign`
		FOREIGN KEY (`mail_host_id`) REFERENCES `featherpanel_mail_hosts` (`id`) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
