-- Add suspended column to featherpanel_vm_instances table
ALTER TABLE `featherpanel_vm_instances` ADD COLUMN IF NOT EXISTS `suspended` TINYINT(1) DEFAULT 0 AFTER `status`;
