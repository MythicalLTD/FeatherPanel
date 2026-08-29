ALTER TABLE `featherpanel_webspaces`
	ADD COLUMN IF NOT EXISTS `state` VARCHAR(32) NOT NULL DEFAULT 'stopped' AFTER `status`;

ALTER TABLE `featherpanel_webplates`
	ADD COLUMN IF NOT EXISTS `container_port` INT(10) UNSIGNED NOT NULL DEFAULT 0 AFTER `startup`;
