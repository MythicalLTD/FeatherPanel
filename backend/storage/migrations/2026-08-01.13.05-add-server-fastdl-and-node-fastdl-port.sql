ALTER TABLE `featherpanel_servers`
    ADD COLUMN `fastdl_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `backup_limit`,
    ADD COLUMN `fastdl_directory` VARCHAR(191) NOT NULL DEFAULT 'fastdl' AFTER `fastdl_enabled`;

ALTER TABLE `featherpanel_nodes`
    ADD COLUMN `fastdl_port` SMALLINT(5) UNSIGNED NOT NULL DEFAULT 80 AFTER `daemonSFTP`;
