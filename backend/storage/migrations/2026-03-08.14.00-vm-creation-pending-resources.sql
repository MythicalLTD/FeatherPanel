-- Store resources directly on pending creation (no plan required).
-- plan_id becomes optional; add memory, cpus, cores, disk, storage, bridge, on_boot.
ALTER TABLE `featherpanel_vm_creation_pending`
    MODIFY COLUMN `plan_id` int(11) DEFAULT NULL;

ALTER TABLE `featherpanel_vm_creation_pending` ADD COLUMN `memory` int(11) NOT NULL DEFAULT 512 AFTER `vm_type`;
ALTER TABLE `featherpanel_vm_creation_pending` ADD COLUMN `cpus` int(11) NOT NULL DEFAULT 1 AFTER `memory`;
ALTER TABLE `featherpanel_vm_creation_pending` ADD COLUMN `cores` int(11) NOT NULL DEFAULT 1 AFTER `cpus`;
ALTER TABLE `featherpanel_vm_creation_pending` ADD COLUMN `disk` int(11) NOT NULL DEFAULT 10 AFTER `cores`;
ALTER TABLE `featherpanel_vm_creation_pending` ADD COLUMN `storage` varchar(50) NOT NULL DEFAULT 'local' AFTER `disk`;
ALTER TABLE `featherpanel_vm_creation_pending` ADD COLUMN `bridge` varchar(20) NOT NULL DEFAULT 'vmbr0' AFTER `storage`;
ALTER TABLE `featherpanel_vm_creation_pending` ADD COLUMN `on_boot` tinyint(1) NOT NULL DEFAULT 1 AFTER `bridge`;
