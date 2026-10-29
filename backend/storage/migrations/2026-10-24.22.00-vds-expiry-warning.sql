-- Guarded with information_schema checks so it is safe to re-run and also works on MySQL 8.
-- Remember which expiry date the owner was already warned about (reset when expires_at changes).
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_instances' AND COLUMN_NAME = 'expiry_warned_at') = 0,
	'ALTER TABLE `featherpanel_vm_instances` ADD COLUMN `expiry_warned_at` DATETIME NULL DEFAULT NULL AFTER `expires_at`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
