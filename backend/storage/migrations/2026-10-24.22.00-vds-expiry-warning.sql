-- Remember which expiry date the owner was already warned about (reset when expires_at changes).
ALTER TABLE `featherpanel_vm_instances`
    ADD COLUMN `expiry_warned_at` DATETIME NULL DEFAULT NULL AFTER `expires_at`;
