-- Short-lived one-time tickets for panel-proxied Proxmox VNC websockets.
-- The async-runner /vnc-proxy endpoint validates the token, deletes the row
-- on first use and then bridges the client WS to Proxmox vncwebsocket.
CREATE TABLE IF NOT EXISTS `featherpanel_vnc_tickets` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(64) NOT NULL,
    `vm_instance_id` INT NOT NULL,
    `user_uuid` CHAR(36) NULL,
    `pve_node` VARCHAR(191) NOT NULL,
    `vm_type` VARCHAR(8) NOT NULL DEFAULT 'qemu',
    `vmid` INT NOT NULL,
    `port` INT NOT NULL,
    `vncticket` TEXT NOT NULL,
    `expires_at` INT NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_token` (`token`),
    KEY `idx_expires` (`expires_at`),
    CONSTRAINT `fk_vnc_ticket_instance` FOREIGN KEY (`vm_instance_id`) REFERENCES `featherpanel_vm_instances` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
