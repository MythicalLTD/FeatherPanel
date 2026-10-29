ALTER TABLE `featherpanel_webspace_schedules`
	ADD COLUMN IF NOT EXISTS `deploy_token_hash` CHAR(64) NULL DEFAULT NULL AFTER `timezone`,
	ADD UNIQUE KEY IF NOT EXISTS `webspace_schedules_deploy_token_hash_unique` (`deploy_token_hash`);
