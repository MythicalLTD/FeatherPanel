CREATE TABLE IF NOT EXISTS `featherpanel_vm_ips` (
	`id` int(11) NOT NULL AUTO_INCREMENT,
	`vm_node_id` int(11) NOT NULL,
	`ip` varchar(191) NOT NULL,
	`cidr` tinyint(3) UNSIGNED DEFAULT NULL,
	`gateway` varchar(191) DEFAULT NULL,
	`is_primary` enum('true','false') NOT NULL DEFAULT 'false',
	`notes` varchar(191) DEFAULT NULL,
	`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `vm_ips_vm_node_id_ip_unique` (`vm_node_id`, `ip`),
	KEY `vm_ips_vm_node_id_foreign` (`vm_node_id`),
	CONSTRAINT `vm_ips_vm_node_id_foreign` FOREIGN KEY (`vm_node_id`) REFERENCES `featherpanel_vm_nodes` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

