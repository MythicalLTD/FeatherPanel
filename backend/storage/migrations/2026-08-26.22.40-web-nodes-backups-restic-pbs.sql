-- Web node restic / Proxmox Backup Server provider settings for FeatherQuilld
ALTER TABLE `featherpanel_web_nodes`
	ADD COLUMN IF NOT EXISTS `backupsResticRepository` VARCHAR(512) NULL DEFAULT NULL AFTER `backupsS3ForcePathStyle`,
	ADD COLUMN IF NOT EXISTS `backupsResticPassword` TEXT NULL DEFAULT NULL AFTER `backupsResticRepository`,
	ADD COLUMN IF NOT EXISTS `backupsResticBinary` VARCHAR(191) NULL DEFAULT NULL AFTER `backupsResticPassword`,
	ADD COLUMN IF NOT EXISTS `backupsPbsRepository` VARCHAR(512) NULL DEFAULT NULL AFTER `backupsResticBinary`,
	ADD COLUMN IF NOT EXISTS `backupsPbsPassword` TEXT NULL DEFAULT NULL AFTER `backupsPbsRepository`,
	ADD COLUMN IF NOT EXISTS `backupsPbsFingerprint` VARCHAR(191) NULL DEFAULT NULL AFTER `backupsPbsPassword`,
	ADD COLUMN IF NOT EXISTS `backupsPbsBinary` VARCHAR(191) NULL DEFAULT NULL AFTER `backupsPbsFingerprint`;
