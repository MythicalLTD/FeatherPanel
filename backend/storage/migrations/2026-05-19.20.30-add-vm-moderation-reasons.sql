-- Suspension metadata for VDS/VM instances (staff visibility)
ALTER TABLE `featherpanel_vm_instances`
ADD COLUMN `suspension_reason` TEXT NULL DEFAULT NULL AFTER `suspended`,
ADD COLUMN `suspended_at` DATETIME NULL DEFAULT NULL AFTER `suspension_reason`,
ADD COLUMN `suspended_by_uuid` CHAR(36) NULL DEFAULT NULL AFTER `suspended_at`;
