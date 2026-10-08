ALTER TABLE `featherpanel_webspaces`
	ADD COLUMN `mailbox_limit` INT(10) UNSIGNED NOT NULL DEFAULT 0 AFTER `database_limit`;

CREATE TABLE IF NOT EXISTS `featherpanel_mail_hosts` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`name` VARCHAR(191) NOT NULL,
	`web_node_id` INT(11) DEFAULT NULL,
	`hostname` VARCHAR(191) NOT NULL,
	`imap_host` VARCHAR(191) NOT NULL,
	`imap_port` INT(10) UNSIGNED NOT NULL DEFAULT 993,
	`imap_encryption` VARCHAR(16) NOT NULL DEFAULT 'ssl',
	`smtp_host` VARCHAR(191) NOT NULL,
	`smtp_port` INT(10) UNSIGNED NOT NULL DEFAULT 587,
	`smtp_encryption` VARCHAR(16) NOT NULL DEFAULT 'tls',
	`pop_host` VARCHAR(191) DEFAULT NULL,
	`pop_port` INT(10) UNSIGNED NOT NULL DEFAULT 995,
	`provision_mode` VARCHAR(32) NOT NULL DEFAULT 'inventory',
	`provision_url` VARCHAR(512) DEFAULT NULL,
	`provision_api_key` TEXT NULL,
	`mx_host` VARCHAR(191) DEFAULT NULL,
	`spf_record` VARCHAR(512) DEFAULT NULL,
	`dkim_selector` VARCHAR(64) DEFAULT NULL,
	`dkim_record` TEXT NULL,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `featherpanel_mail_hosts_web_node_id` (`web_node_id`),
	CONSTRAINT `featherpanel_mail_hosts_web_node_id_foreign`
		FOREIGN KEY (`web_node_id`) REFERENCES `featherpanel_web_nodes` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `featherpanel_webspace_mailboxes` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`webspace_id` INT(11) NOT NULL,
	`mail_host_id` INT(11) NOT NULL,
	`local_part` VARCHAR(64) NOT NULL,
	`domain` VARCHAR(191) NOT NULL,
	`password` TEXT NOT NULL,
	`quota_mb` INT(10) UNSIGNED NOT NULL DEFAULT 1024,
	`enabled` TINYINT(1) NOT NULL DEFAULT 1,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `featherpanel_webspace_mailboxes_email_unique` (`webspace_id`, `local_part`, `domain`),
	KEY `featherpanel_webspace_mailboxes_host_id` (`mail_host_id`),
	CONSTRAINT `featherpanel_webspace_mailboxes_webspace_id_foreign`
		FOREIGN KEY (`webspace_id`) REFERENCES `featherpanel_webspaces` (`id`) ON DELETE CASCADE,
	CONSTRAINT `featherpanel_webspace_mailboxes_host_id_foreign`
		FOREIGN KEY (`mail_host_id`) REFERENCES `featherpanel_mail_hosts` (`id`) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
