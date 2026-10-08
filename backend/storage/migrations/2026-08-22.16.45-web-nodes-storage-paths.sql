ALTER TABLE `featherpanel_web_nodes`
	ADD COLUMN `websitesPath` VARCHAR(191) NULL DEFAULT NULL AFTER `daemonBase`,
	ADD COLUMN `backupsPath` VARCHAR(191) NULL DEFAULT NULL AFTER `websitesPath`,
	ADD COLUMN `addonsPath` VARCHAR(191) NULL DEFAULT NULL AFTER `backupsPath`;
