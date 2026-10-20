-- Note the server's users keep on an allocation (separate from the admin `notes`).
-- Cleared whenever the allocation leaves the server.
ALTER TABLE `featherpanel_allocations`
ADD COLUMN `server_notes` VARCHAR(255) NULL DEFAULT NULL AFTER `notes`;
