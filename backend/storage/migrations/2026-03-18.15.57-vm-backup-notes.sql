-- Add notes column to track backup metadata
ALTER TABLE `featherpanel_vm_instance_backups`
ADD COLUMN `notes` TEXT NULL AFTER `format`;
