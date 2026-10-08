ALTER TABLE `featherpanel_webspaces`
	ADD COLUMN `waf_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `memory_limit`;
