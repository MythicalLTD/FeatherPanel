ALTER TABLE `featherpanel_webspaces`
	ADD COLUMN `cpu_limit` DECIMAL(6, 2) UNSIGNED NOT NULL DEFAULT 0 AFTER `disk`,
	ADD COLUMN `memory_limit` INT(10) UNSIGNED NOT NULL DEFAULT 0 AFTER `cpu_limit`;
