ALTER TABLE `featherpanel_vm_ips`
	ADD COLUMN `address_scope` ENUM('public', 'private') NOT NULL DEFAULT 'public' AFTER `is_primary`,
	ADD COLUMN `assignment_mode` ENUM('static', 'dhcp') NOT NULL DEFAULT 'static' AFTER `address_scope`,
	ADD COLUMN `pve_node` VARCHAR(100) NULL DEFAULT NULL AFTER `assignment_mode`,
	ADD KEY `vm_ips_pve_node_idx` (`vm_node_id`, `pve_node`),
	ADD KEY `vm_ips_assignment_mode_idx` (`vm_node_id`, `assignment_mode`);
