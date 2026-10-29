-- Guarded with information_schema checks so it is safe to re-run and also works on MySQL 8.
-- Per-node ISO / rescue settings (moved off global Admin → Settings → VDS).
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_nodes' AND COLUMN_NAME = 'storage_iso_user') = 0,
	'ALTER TABLE `featherpanel_vm_nodes` ADD COLUMN `storage_iso_user` TEXT NOT NULL DEFAULT '''' AFTER `storage_backups`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_nodes' AND COLUMN_NAME = 'storage_iso_allowed') = 0,
	'ALTER TABLE `featherpanel_vm_nodes` ADD COLUMN `storage_iso_allowed` TEXT NOT NULL DEFAULT '''' AFTER `storage_iso_user`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_nodes' AND COLUMN_NAME = 'rescue_iso') = 0,
	'ALTER TABLE `featherpanel_vm_nodes` ADD COLUMN `rescue_iso` TEXT NOT NULL DEFAULT '''' AFTER `storage_iso_allowed`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;

-- Seed from former global panel settings so existing installs keep working.
UPDATE `featherpanel_vm_nodes` n
SET
	n.`storage_iso_user` = COALESCE(
		(SELECT s.`value` FROM `featherpanel_settings` s WHERE s.`name` = 'vds_iso_user_storage' LIMIT 1),
		''
	)
WHERE n.`storage_iso_user` = '';

UPDATE `featherpanel_vm_nodes` n
SET
	n.`storage_iso_allowed` = COALESCE(
		(SELECT s.`value` FROM `featherpanel_settings` s WHERE s.`name` = 'vds_iso_allowed_storages' LIMIT 1),
		''
	)
WHERE n.`storage_iso_allowed` = '';

UPDATE `featherpanel_vm_nodes` n
SET
	n.`rescue_iso` = COALESCE(
		(SELECT s.`value` FROM `featherpanel_settings` s WHERE s.`name` = 'vds_rescue_iso' LIMIT 1),
		''
	)
WHERE n.`rescue_iso` = '';
