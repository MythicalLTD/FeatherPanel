-- Add old/new allocation tracking to server transfers
-- This allows proper allocation management during transfers:
-- - old_allocation: The server's primary allocation before transfer
-- - new_allocation: The new primary allocation on destination node
-- - old_additional_allocations: JSON array of additional allocation IDs before transfer
-- - new_additional_allocations: JSON array of additional allocation IDs on destination node
-- Add old_allocation column (source server's primary allocation)
ALTER TABLE `featherpanel_server_transfers`
ADD COLUMN `old_allocation` INT NULL AFTER `source_allocation_id`;

ALTER TABLE `featherpanel_server_transfers` ADD KEY `server_transfers_old_allocation_index` (`old_allocation`);

-- Add new_allocation column (destination server's primary allocation)
ALTER TABLE `featherpanel_server_transfers`
ADD COLUMN `new_allocation` INT NULL AFTER `old_allocation`;

ALTER TABLE `featherpanel_server_transfers` ADD KEY `server_transfers_new_allocation_index` (`new_allocation`);

-- Add old_additional_allocations as JSON (array of allocation IDs)
ALTER TABLE `featherpanel_server_transfers`
ADD COLUMN `old_additional_allocations` JSON NULL AFTER `new_allocation`;

-- Add new_additional_allocations as JSON (array of allocation IDs)
ALTER TABLE `featherpanel_server_transfers`
ADD COLUMN `new_additional_allocations` JSON NULL AFTER `old_additional_allocations`;

-- Add archived flag to track completed/cancelled transfers
ALTER TABLE `featherpanel_server_transfers`
ADD COLUMN `archived` TINYINT (1) NOT NULL DEFAULT 0 AFTER `error`;

ALTER TABLE `featherpanel_server_transfers` ADD KEY `server_transfers_archived_index` (`archived`);

-- Add successful flag (null = in progress, true = success, false = failed)
ALTER TABLE `featherpanel_server_transfers`
ADD COLUMN `successful` TINYINT (1) NULL AFTER `archived`;