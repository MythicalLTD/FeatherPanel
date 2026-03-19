CREATE TABLE
	IF NOT EXISTS `featherpanel_vm_instance_ips` (
		`id` int (11) NOT NULL AUTO_INCREMENT,
		`vm_instance_id` int (11) NOT NULL,
		`vm_ip_id` int (11) NOT NULL,
		`network_key` varchar(20) NOT NULL DEFAULT 'net0',
		`bridge` varchar(50) DEFAULT NULL,
		`interface_name` varchar(50) DEFAULT NULL,
		`is_primary` tinyint (1) NOT NULL DEFAULT 0,
		`sort_order` int (11) NOT NULL DEFAULT 0,
		`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`),
		UNIQUE KEY `vm_instance_ips_instance_ip_unique` (`vm_instance_id`, `vm_ip_id`),
		UNIQUE KEY `vm_instance_ips_ip_unique` (`vm_ip_id`),
		UNIQUE KEY `vm_instance_ips_instance_network_key_unique` (`vm_instance_id`, `network_key`),
		KEY `vm_instance_ips_instance_idx` (`vm_instance_id`),
		CONSTRAINT `vm_instance_ips_instance_foreign` FOREIGN KEY (`vm_instance_id`) REFERENCES `featherpanel_vm_instances` (`id`) ON DELETE CASCADE,
		CONSTRAINT `vm_instance_ips_ip_foreign` FOREIGN KEY (`vm_ip_id`) REFERENCES `featherpanel_vm_ips` (`id`) ON DELETE CASCADE
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT IGNORE INTO `featherpanel_vm_instance_ips` (
	`vm_instance_id`,
	`vm_ip_id`,
	`network_key`,
	`bridge`,
	`interface_name`,
	`is_primary`,
	`sort_order`
)
SELECT
	`id`,
	`vm_ip_id`,
	'net0',
	NULL,
	'eth0',
	1,
	0
FROM
	`featherpanel_vm_instances`
WHERE
	`vm_ip_id` IS NOT NULL;