-- VM Subusers: Allow multiple users to access and manage VM instances
CREATE TABLE IF NOT EXISTS `featherpanel_vm_subusers` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL COMMENT 'User ID from featherpanel_users',
    `vm_instance_id` int(11) NOT NULL COMMENT 'VM Instance ID from featherpanel_vm_instances',
    `permissions` text NOT NULL COMMENT 'JSON array of permissions (power, console, config, etc.)',
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_user_vm` (`user_id`, `vm_instance_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_vm_instance_id` (`vm_instance_id`),
    CONSTRAINT `fk_vm_subuser_user` FOREIGN KEY (`user_id`) REFERENCES `featherpanel_users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_vm_subuser_instance` FOREIGN KEY (`vm_instance_id`) REFERENCES `featherpanel_vm_instances` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='VM instance subusers with granular permissions';
