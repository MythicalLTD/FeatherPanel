-- Fully remove VM Plans: drop FK from vm_instances, then drop plans table.
ALTER TABLE `featherpanel_vm_instances`
    DROP FOREIGN KEY IF EXISTS `featherpanel_vm_instances_plan_id_foreign`;

DROP TABLE IF EXISTS `featherpanel_vm_plans`;
