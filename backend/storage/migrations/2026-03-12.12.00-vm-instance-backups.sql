CREATE TABLE
	IF NOT EXISTS `featherpanel_vm_instance_backups` (
		`id` int(11) NOT NULL AUTO_INCREMENT,
		`vm_instance_id` int(11) NOT NULL,
		`vmid` int(11) NOT NULL,
		`storage` varchar(191) NOT NULL,
		`volid` varchar(191) NOT NULL,
		`size_bytes` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
		`ctime` int(11) UNSIGNED NOT NULL DEFAULT 0,
		`format` varchar(32) DEFAULT NULL,
		`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		KEY `vm_instance_backups_instance_id_index` (`vm_instance_id`),
		KEY `vm_instance_backups_volid_index` (`volid`)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

