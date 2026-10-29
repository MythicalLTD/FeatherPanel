-- Guarded with information_schema checks so it is safe to re-run and also works on MySQL 8.
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_activity' AND INDEX_NAME = 'idx_activity_created_at') = 0,
	'ALTER TABLE `featherpanel_activity` ADD INDEX `idx_activity_created_at` (`created_at`)',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_activity' AND INDEX_NAME = 'idx_activity_name') = 0,
	'ALTER TABLE `featherpanel_activity` ADD INDEX `idx_activity_name` (`name`)',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
