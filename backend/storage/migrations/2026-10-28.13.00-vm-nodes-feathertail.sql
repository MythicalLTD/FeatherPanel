-- Guarded with information_schema checks so it is safe to re-run and also works on MySQL 8.
-- FeatherTail host agent credentials on VDS / Proxmox nodes.
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_nodes' AND COLUMN_NAME = 'feathertail_enabled') = 0,
	'ALTER TABLE `featherpanel_vm_nodes` ADD COLUMN `feathertail_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `rescue_iso`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_nodes' AND COLUMN_NAME = 'feathertail_url') = 0,
	'ALTER TABLE `featherpanel_vm_nodes` ADD COLUMN `feathertail_url` VARCHAR(512) NOT NULL DEFAULT '''' AFTER `feathertail_enabled`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_nodes' AND COLUMN_NAME = 'feathertail_token') = 0,
	'ALTER TABLE `featherpanel_vm_nodes` ADD COLUMN `feathertail_token` TEXT NULL DEFAULT NULL AFTER `feathertail_url`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_nodes' AND COLUMN_NAME = 'feathertail_tls_no_verify') = 0,
	'ALTER TABLE `featherpanel_vm_nodes` ADD COLUMN `feathertail_tls_no_verify` TINYINT(1) NOT NULL DEFAULT 0 AFTER `feathertail_token`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
