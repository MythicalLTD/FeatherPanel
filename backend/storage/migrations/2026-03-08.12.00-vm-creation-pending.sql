-- Pending VM creation: clone started, waiting for completion before config + DB insert.
-- Avoids long-running POST that can hit proxy timeouts (ECONNRESET).
CREATE TABLE IF NOT EXISTS `featherpanel_vm_creation_pending` (
    `creation_id` varchar(64) NOT NULL,
    `upid` varchar(128) NOT NULL,
    `target_node` varchar(128) NOT NULL,
    `vmid` int(11) NOT NULL,
    `hostname` varchar(255) NOT NULL,
    `vm_node_id` int(11) NOT NULL,
    `plan_id` int(11) NOT NULL,
    `template_id` int(11) DEFAULT NULL,
    `vm_ip_id` int(11) DEFAULT NULL,
    `user_uuid` varchar(36) DEFAULT NULL,
    `notes` text DEFAULT NULL,
    `vm_type` varchar(8) NOT NULL DEFAULT 'qemu',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`creation_id`),
    KEY `featherpanel_vm_creation_pending_vm_node_id_idx` (`vm_node_id`),
    KEY `featherpanel_vm_creation_pending_created_at_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
