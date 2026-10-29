-- Guarded with information_schema checks so it is safe to re-run and also works on MySQL 8.
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_ips' AND COLUMN_NAME = 'address_scope') = 0,
	'ALTER TABLE `featherpanel_vm_ips` ADD COLUMN `address_scope` ENUM(''public'', ''private'') NOT NULL DEFAULT ''public'' AFTER `is_primary`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_ips' AND COLUMN_NAME = 'assignment_mode') = 0,
	'ALTER TABLE `featherpanel_vm_ips` ADD COLUMN `assignment_mode` ENUM(''static'', ''dhcp'') NOT NULL DEFAULT ''static'' AFTER `address_scope`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_ips' AND COLUMN_NAME = 'pve_node') = 0,
	'ALTER TABLE `featherpanel_vm_ips` ADD COLUMN `pve_node` VARCHAR(100) NULL DEFAULT NULL AFTER `assignment_mode`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_ips' AND INDEX_NAME = 'vm_ips_pve_node_idx') = 0,
	'ALTER TABLE `featherpanel_vm_ips` ADD KEY `vm_ips_pve_node_idx` (`vm_node_id`, `pve_node`)',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_ips' AND INDEX_NAME = 'vm_ips_assignment_mode_idx') = 0,
	'ALTER TABLE `featherpanel_vm_ips` ADD KEY `vm_ips_assignment_mode_idx` (`vm_node_id`, `assignment_mode`)',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
