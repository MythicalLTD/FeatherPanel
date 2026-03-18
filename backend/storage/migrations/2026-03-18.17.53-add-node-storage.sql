ALTER TABLE `featherpanel_vm_nodes`
    ADD COLUMN `storage_tpm` TEXT NOT NULL DEFAULT '' AFTER `secret`,
    ADD COLUMN `storage_efi` TEXT NOT NULL DEFAULT '' AFTER `storage_tpm`,
    ADD COLUMN `storage_backups` TEXT NOT NULL DEFAULT '' AFTER `storage_efi`;
