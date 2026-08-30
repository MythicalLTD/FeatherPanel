ALTER TABLE `featherpanel_webspace_domains`
	ADD COLUMN IF NOT EXISTS `document_root` VARCHAR(255) NOT NULL DEFAULT '' AFTER `redirect_target`;

ALTER TABLE `featherpanel_webspaces`
	ADD COLUMN IF NOT EXISTS `waf_deny_ips` TEXT NULL AFTER `waf_enabled`;
