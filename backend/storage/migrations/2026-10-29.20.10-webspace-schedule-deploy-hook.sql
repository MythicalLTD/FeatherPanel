-- Guarded with information_schema checks so it is safe to re-run and also works on MySQL 8.
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_webspace_schedules' AND COLUMN_NAME = 'deploy_token_hash') = 0,
	'ALTER TABLE `featherpanel_webspace_schedules` ADD COLUMN `deploy_token_hash` CHAR(64) NULL DEFAULT NULL AFTER `timezone`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_webspace_schedules' AND INDEX_NAME = 'webspace_schedules_deploy_token_hash_unique') = 0,
	'ALTER TABLE `featherpanel_webspace_schedules` ADD UNIQUE KEY `webspace_schedules_deploy_token_hash_unique` (`deploy_token_hash`)',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
