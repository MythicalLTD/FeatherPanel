-- Add resource columns to vm_instances so RAM/CPU/disk/on_boot are tracked in the DB.
ALTER TABLE `featherpanel_vm_instances`
    ADD COLUMN IF NOT EXISTS `memory` INT NOT NULL DEFAULT 512,
    ADD COLUMN IF NOT EXISTS `cpus` INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS `cores` INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS `disk_gb` INT NOT NULL DEFAULT 10,
    ADD COLUMN IF NOT EXISTS `on_boot` TINYINT(1) NOT NULL DEFAULT 1;

