-- Make node_id column nullable to allow databases without a node assignment
-- This is useful for migration purposes and databases that don't belong to a specific node
-- Drop the foreign key constraint first
ALTER TABLE `featherpanel_databases`
DROP FOREIGN KEY `featherpanel_databases_node_id_foreign`;

-- Modify the column to allow NULL values
ALTER TABLE `featherpanel_databases` MODIFY COLUMN `node_id` INT (11) NULL DEFAULT NULL;

-- Re-add the foreign key constraint (NULL values are allowed and will skip the foreign key check)
ALTER TABLE `featherpanel_databases` ADD CONSTRAINT `featherpanel_databases_node_id_foreign` FOREIGN KEY (`node_id`) REFERENCES `featherpanel_nodes` (`id`) ON DELETE CASCADE;