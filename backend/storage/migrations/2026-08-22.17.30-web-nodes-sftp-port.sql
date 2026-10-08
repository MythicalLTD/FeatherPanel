ALTER TABLE `featherpanel_web_nodes`
	ADD COLUMN `sftpPort` INT(10) UNSIGNED NOT NULL DEFAULT 2222 AFTER `sftpKeyAlgorithm`;
