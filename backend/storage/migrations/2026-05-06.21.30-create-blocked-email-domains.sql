CREATE TABLE IF NOT EXISTS `featherpanel_blocked_email_domains` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `domain` VARCHAR(253) NOT NULL COMMENT 'Normalized ASCII/lowercase hostname (no leading @)',
    `source` ENUM('manual','preset') NOT NULL DEFAULT 'manual' COMMENT 'manual = admin-added, preset = imported from bundled list',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `featherpanel_blocked_email_domains_domain_unique` (`domain`),
    KEY `featherpanel_blocked_email_domains_source_index` (`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Domains blocked for registration / email changes when email_domain_blocking_enabled is true';

DELETE FROM `featherpanel_settings` WHERE `name` IN ('email_domain_blacklist', 'email_block_disposable_domains');
