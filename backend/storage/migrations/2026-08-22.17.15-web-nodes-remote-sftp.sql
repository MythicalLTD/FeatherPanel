ALTER TABLE `featherpanel_web_nodes`
	ADD COLUMN `remoteTimeout` INT(10) UNSIGNED NOT NULL DEFAULT 30 AFTER `quilldConfigOverrides`,
	ADD COLUMN `remoteRetryLimit` INT(10) UNSIGNED NOT NULL DEFAULT 10 AFTER `remoteTimeout`,
	ADD COLUMN `remoteCustomHeaders` TEXT NULL DEFAULT NULL AFTER `remoteRetryLimit`,
	ADD COLUMN `sftpEnabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `remoteCustomHeaders`,
	ADD COLUMN `sftpKeyAlgorithm` VARCHAR(32) NOT NULL DEFAULT 'ssh-ed25519' AFTER `sftpEnabled`,
	ADD COLUMN `sftpDisablePasswordAuth` TINYINT(1) NOT NULL DEFAULT 0 AFTER `sftpKeyAlgorithm`;
