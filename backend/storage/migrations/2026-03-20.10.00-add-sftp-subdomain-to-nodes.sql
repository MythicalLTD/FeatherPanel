-- Add sftp_subdomain column to nodes table for custom SFTP subdomain configuration
ALTER TABLE `featherpanel_nodes`
ADD COLUMN `sftp_subdomain` VARCHAR(255) NULL DEFAULT NULL COMMENT 'Custom subdomain for SFTP access (e.g., sftp.node.domain.de). DNS must be configured externally.';
