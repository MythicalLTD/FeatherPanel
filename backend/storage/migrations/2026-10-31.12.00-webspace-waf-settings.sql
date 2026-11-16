ALTER TABLE `featherpanel_webspaces`
	ADD COLUMN IF NOT EXISTS `waf_settings` MEDIUMTEXT NULL AFTER `waf_deny_paths`;

-- WebSpaces that already had the firewall switched on keep the HSTS header they were sending before.
UPDATE `featherpanel_webspaces`
	SET `waf_settings` = '{"headers":{"hsts":true}}'
	WHERE `waf_enabled` = 1 AND `waf_settings` IS NULL;
