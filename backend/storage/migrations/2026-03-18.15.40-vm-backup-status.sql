-- Add status column to track backup progress (pending, completed, failed)
ALTER TABLE `featherpanel_vm_instance_backups`
ADD COLUMN `status` VARCHAR(32) NOT NULL DEFAULT 'pending' AFTER `vm_instance_id`;
