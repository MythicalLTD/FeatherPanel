ALTER TABLE `featherpanel_hosting_packages`
    ADD COLUMN `bandwidth_limit_gb` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `memory_limit`;

ALTER TABLE `featherpanel_webspaces`
    ADD COLUMN `bandwidth_limit_gb` INT UNSIGNED NULL DEFAULT NULL AFTER `memory_limit`,
    ADD COLUMN `bandwidth_used_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER `bandwidth_limit_gb`,
    ADD COLUMN `bandwidth_period_start` DATE NULL DEFAULT NULL AFTER `bandwidth_used_bytes`;
