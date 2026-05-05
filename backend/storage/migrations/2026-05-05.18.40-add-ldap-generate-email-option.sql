-- Add generate_email_if_missing option to ldap_providers table
ALTER TABLE `featherpanel_ldap_providers` ADD COLUMN `generate_email_if_missing` ENUM('true', 'false') NOT NULL DEFAULT 'false' AFTER `sync_attributes`;
