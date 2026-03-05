-- VM Plans: hardware specs for virtual machines / containers
CREATE TABLE IF NOT EXISTS `featherpanel_vm_plans` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `description` text DEFAULT NULL,
    `vm_type` enum('qemu','lxc') NOT NULL DEFAULT 'qemu',
    `cpus` smallint(4) UNSIGNED NOT NULL DEFAULT 1,
    `cores` smallint(4) UNSIGNED NOT NULL DEFAULT 1,
    `cpu_type` varchar(30) DEFAULT NULL,
    `cpu_limit` smallint(5) UNSIGNED DEFAULT NULL,
    `cpu_units` int(10) UNSIGNED DEFAULT 1024,
    `memory` int(10) UNSIGNED NOT NULL DEFAULT 512,
    `balloon` int(10) DEFAULT 0,
    `swap` int(10) UNSIGNED DEFAULT 0,
    `disk` int(10) UNSIGNED NOT NULL DEFAULT 10,
    `disk_format` varchar(10) DEFAULT 'qcow2',
    `disk_cache` varchar(20) DEFAULT NULL,
    `disk_type` varchar(20) DEFAULT 'scsi',
    `storage` varchar(50) NOT NULL DEFAULT 'local',
    `disk_io` varchar(20) DEFAULT '0',
    `bridge` varchar(20) NOT NULL DEFAULT 'vmbr0',
    `vlan_id` int(10) DEFAULT NULL,
    `net_model` varchar(10) DEFAULT 'virtio',
    `net_rate` int(10) DEFAULT 0,
    `firewall` tinyint(1) UNSIGNED NOT NULL DEFAULT 0,
    `bandwidth` int(10) UNSIGNED DEFAULT 0,
    `kvm` tinyint(1) UNSIGNED DEFAULT 1,
    `on_boot` tinyint(1) UNSIGNED DEFAULT 1,
    `unprivileged` tinyint(1) UNSIGNED DEFAULT 0,
    `ipv6` varchar(10) DEFAULT 'auto',
    `is_active` enum('true','false') NOT NULL DEFAULT 'true',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- VM Templates: OS templates/ISOs available for provisioning
CREATE TABLE IF NOT EXISTS `featherpanel_vm_templates` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `description` text DEFAULT NULL,
    `guest_type` enum('qemu','lxc') NOT NULL DEFAULT 'qemu',
    `os_type` varchar(30) DEFAULT NULL,
    `storage` varchar(50) NOT NULL DEFAULT 'local',
    `template_file` varchar(255) DEFAULT NULL,
    `vm_node_id` int(11) DEFAULT NULL,
    `is_active` enum('true','false') NOT NULL DEFAULT 'true',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `featherpanel_vm_templates_node_id_foreign` (`vm_node_id`),
    CONSTRAINT `featherpanel_vm_templates_node_id_foreign` FOREIGN KEY (`vm_node_id`) REFERENCES `featherpanel_vm_nodes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- VM SSH Keys: stored SSH public keys for injection at provision time
CREATE TABLE IF NOT EXISTS `featherpanel_vm_ssh_keys` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) DEFAULT NULL,
    `name` varchar(255) NOT NULL,
    `public_key` text NOT NULL,
    `fingerprint` varchar(100) DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `featherpanel_vm_ssh_keys_user_id_idx` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- VM Instances: provisioned virtual machines and containers
CREATE TABLE IF NOT EXISTS `featherpanel_vm_instances` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `vmid` int(11) NOT NULL,
    `vm_node_id` int(11) NOT NULL,
    `pve_node` varchar(100) DEFAULT NULL,
    `user_id` int(11) DEFAULT NULL,
    `plan_id` int(11) DEFAULT NULL,
    `template_id` int(11) DEFAULT NULL,
    `vm_type` enum('qemu','lxc') NOT NULL DEFAULT 'qemu',
    `hostname` varchar(255) DEFAULT NULL,
    `status` enum('running','stopped','suspended','creating','deleting','error','unknown') NOT NULL DEFAULT 'unknown',
    `ip_address` varchar(45) DEFAULT NULL,
    `ip6_prefix` varchar(128) DEFAULT NULL,
    `subnet_mask` varchar(45) DEFAULT NULL,
    `gateway` varchar(45) DEFAULT NULL,
    `notes` text DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `featherpanel_vm_instances_node_vmid_unique` (`vm_node_id`, `vmid`),
    KEY `featherpanel_vm_instances_user_id_idx` (`user_id`),
    KEY `featherpanel_vm_instances_plan_id_idx` (`plan_id`),
    CONSTRAINT `featherpanel_vm_instances_node_id_foreign` FOREIGN KEY (`vm_node_id`) REFERENCES `featherpanel_vm_nodes` (`id`) ON DELETE CASCADE,
    CONSTRAINT `featherpanel_vm_instances_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `featherpanel_vm_plans` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- VM Logs: audit trail for all provisioning and lifecycle actions
CREATE TABLE IF NOT EXISTS `featherpanel_vm_logs` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `vm_instance_id` int(11) DEFAULT NULL,
    `vm_node_id` int(11) DEFAULT NULL,
    `user_id` int(11) DEFAULT NULL,
    `actor_id` int(11) DEFAULT NULL,
    `level` enum('info','warning','error') NOT NULL DEFAULT 'info',
    `action` varchar(100) NOT NULL,
    `message` text DEFAULT NULL,
    `request` text DEFAULT NULL,
    `response` text DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `featherpanel_vm_logs_instance_id_idx` (`vm_instance_id`),
    KEY `featherpanel_vm_logs_node_id_idx` (`vm_node_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
