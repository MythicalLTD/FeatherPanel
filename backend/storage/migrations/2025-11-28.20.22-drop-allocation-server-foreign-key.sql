-- Drop the foreign key constraint on server_id to allow allocations with non-existent server_id
-- This is useful for migration purposes when servers haven't been imported yet
-- The server_id column is already nullable, so NULL values are fine
-- Referential integrity can be maintained at the application level if needed
ALTER TABLE `featherpanel_allocations`
DROP FOREIGN KEY `allocations_server_id_foreign`;