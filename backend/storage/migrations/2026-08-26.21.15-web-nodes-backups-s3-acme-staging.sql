-- Web node S3 backup provider settings + ACME staging flag for FeatherQuilld
ALTER TABLE `featherpanel_web_nodes`
	ADD COLUMN IF NOT EXISTS `acmeStaging` TINYINT(1) NOT NULL DEFAULT 0 AFTER `acmeEmail`,
	ADD COLUMN IF NOT EXISTS `backupsProvider` VARCHAR(16) NOT NULL DEFAULT 'local' AFTER `backupsPath`,
	ADD COLUMN IF NOT EXISTS `backupsS3Endpoint` VARCHAR(191) NULL DEFAULT NULL AFTER `backupsProvider`,
	ADD COLUMN IF NOT EXISTS `backupsS3Region` VARCHAR(64) NULL DEFAULT NULL AFTER `backupsS3Endpoint`,
	ADD COLUMN IF NOT EXISTS `backupsS3Bucket` VARCHAR(191) NULL DEFAULT NULL AFTER `backupsS3Region`,
	ADD COLUMN IF NOT EXISTS `backupsS3AccessKey` VARCHAR(191) NULL DEFAULT NULL AFTER `backupsS3Bucket`,
	ADD COLUMN IF NOT EXISTS `backupsS3SecretKey` TEXT NULL DEFAULT NULL AFTER `backupsS3AccessKey`,
	ADD COLUMN IF NOT EXISTS `backupsS3Prefix` VARCHAR(191) NULL DEFAULT NULL AFTER `backupsS3SecretKey`,
	ADD COLUMN IF NOT EXISTS `backupsS3ForcePathStyle` TINYINT(1) NOT NULL DEFAULT 0 AFTER `backupsS3Prefix`;
