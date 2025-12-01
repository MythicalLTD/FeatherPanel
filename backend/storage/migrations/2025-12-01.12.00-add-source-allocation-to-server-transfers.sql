-- Add source_allocation_id to server transfers
-- Stores the original allocation ID so transfers can be safely reverted if needed
ALTER TABLE `featherpanel_server_transfers`
ADD COLUMN `source_allocation_id` INT NULL AFTER `destination_node_id`;

ALTER TABLE `featherpanel_server_transfers` ADD KEY `server_transfers_source_allocation_id_index` (`source_allocation_id`);

ALTER TABLE `featherpanel_server_transfers` ADD CONSTRAINT `server_transfers_source_allocation_id_foreign` FOREIGN KEY (`source_allocation_id`) REFERENCES `featherpanel_allocations` (`id`) ON DELETE SET NULL;