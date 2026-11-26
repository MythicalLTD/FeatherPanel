-- External IDs for VDS instances and WebSpaces, so billing systems (WHMCS, Blesta, Paymenter)
-- can find the instance they provisioned (servers already have this column).
ALTER TABLE `featherpanel_vm_instances` ADD COLUMN IF NOT EXISTS `external_id` VARCHAR(191) NULL DEFAULT NULL AFTER `id`;
ALTER TABLE `featherpanel_vm_instances` ADD UNIQUE INDEX IF NOT EXISTS `featherpanel_vm_instances_external_id_unique` (`external_id`);
ALTER TABLE `featherpanel_webspaces` ADD COLUMN IF NOT EXISTS `external_id` VARCHAR(191) NULL DEFAULT NULL AFTER `id`;
ALTER TABLE `featherpanel_webspaces` ADD UNIQUE INDEX IF NOT EXISTS `featherpanel_webspaces_external_id_unique` (`external_id`);
