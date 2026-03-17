-- VM background tasks tracking
CREATE TABLE IF NOT EXISTS `featherpanel_vm_tasks` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `task_id` varchar(64) NOT NULL,
    `instance_id` int(11) DEFAULT NULL,
    `vm_node_id` int(11) DEFAULT NULL,
    `task_type` varchar(32) NOT NULL, -- create, reinstall, backup, restore, delete
    `status` varchar(16) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    `upid` varchar(128) NOT NULL,
    `target_node` varchar(128) NOT NULL,
    `vmid` int(11) NOT NULL,
    `data` longtext DEFAULT NULL,
    `error` text DEFAULT NULL,
    `user_uuid` varchar(36) DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `task_id` (`task_id`),
    KEY `instance_id` (`instance_id`),
    KEY `status` (`status`),
    KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
