-- Add backup_limit column to vm_instances for per-instance backup quota control
ALTER TABLE `featherpanel_vm_instances`
ADD COLUMN `backup_limit` INT NOT NULL DEFAULT 5;
