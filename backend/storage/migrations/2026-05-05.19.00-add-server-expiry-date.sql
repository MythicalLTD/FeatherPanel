-- Add expiry date to game servers
ALTER TABLE `featherpanel_servers` 
ADD COLUMN `expires_at` DATETIME NULL DEFAULT NULL AFTER `installed_at`,
ADD INDEX `servers_expires_at_idx` (`expires_at`);

-- Add expiry date to VM instances
ALTER TABLE `featherpanel_vm_instances` 
ADD COLUMN `expires_at` DATETIME NULL DEFAULT NULL AFTER `updated_at`,
ADD INDEX `vm_instances_expires_at_idx` (`expires_at`);
