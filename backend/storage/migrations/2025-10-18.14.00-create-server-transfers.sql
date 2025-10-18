-- Server Transfers Table
-- Stores transfer status and progress for server moves between nodes

CREATE TABLE IF NOT EXISTS `featherpanel_server_transfers` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `server_id` INT NOT NULL,
    `source_node_id` INT NOT NULL,
    `destination_node_id` INT NOT NULL,
    `destination_allocation_id` INT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `progress` DECIMAL(5,2) NULL DEFAULT 0.00,
    `started_at` TIMESTAMP NULL,
    `completed_at` TIMESTAMP NULL,
    `error` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `server_transfers_server_id_index` (`server_id`),
    KEY `server_transfers_status_index` (`status`),
    CONSTRAINT `server_transfers_server_id_foreign`
        FOREIGN KEY (`server_id`)
        REFERENCES `featherpanel_servers` (`id`)
        ON DELETE CASCADE,
    CONSTRAINT `server_transfers_source_node_id_foreign`
        FOREIGN KEY (`source_node_id`)
        REFERENCES `featherpanel_nodes` (`id`)
        ON DELETE CASCADE,
    CONSTRAINT `server_transfers_destination_node_id_foreign`
        FOREIGN KEY (`destination_node_id`)
        REFERENCES `featherpanel_nodes` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

