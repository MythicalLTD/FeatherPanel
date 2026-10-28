-- Per-node ISO / rescue settings (moved off global Admin → Settings → VDS).
ALTER TABLE `featherpanel_vm_nodes`
	ADD COLUMN `storage_iso_user` TEXT NOT NULL DEFAULT '' AFTER `storage_backups`,
	ADD COLUMN `storage_iso_allowed` TEXT NOT NULL DEFAULT '' AFTER `storage_iso_user`,
	ADD COLUMN `rescue_iso` TEXT NOT NULL DEFAULT '' AFTER `storage_iso_allowed`;

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
