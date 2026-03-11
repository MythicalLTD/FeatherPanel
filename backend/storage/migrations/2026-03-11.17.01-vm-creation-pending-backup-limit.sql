-- Add backup_limit to vm_creation_pending so it is carried through the async creation flow
ALTER TABLE `featherpanel_vm_creation_pending`
ADD COLUMN `backup_limit` INT NOT NULL DEFAULT 5;
