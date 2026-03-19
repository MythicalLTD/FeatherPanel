-- Add database_subdomain column to databases table for custom database subdomain configuration
ALTER TABLE `featherpanel_databases`
ADD COLUMN `database_subdomain` VARCHAR(255) NULL DEFAULT NULL COMMENT 'Custom subdomain for database access (e.g., db1.node.domain.de). DNS must be configured externally.';
