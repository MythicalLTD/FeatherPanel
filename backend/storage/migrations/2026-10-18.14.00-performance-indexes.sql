-- Guarded with information_schema checks so it is safe to re-run and also works on MySQL 8.
-- Indexes for the hot list queries (found by profiling with 300k activity rows):
--  * admin/user activity logs sort by created_at (full scan + filesort without it)
--  * per-user / per-server activity and backup lists filter then sort
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_activity' AND INDEX_NAME = 'activity_created_at_index') = 0,
	'ALTER TABLE `featherpanel_activity` ADD INDEX `activity_created_at_index` (`created_at`)',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_activity' AND INDEX_NAME = 'activity_user_uuid_created_at_index') = 0,
	'ALTER TABLE `featherpanel_activity` ADD INDEX `activity_user_uuid_created_at_index` (`user_uuid`, `created_at`)',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;

SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_server_activities' AND INDEX_NAME = 'server_activities_server_timestamp_index') = 0,
	'ALTER TABLE `featherpanel_server_activities` ADD INDEX `server_activities_server_timestamp_index` (`server_id`, `timestamp`)',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_server_activities' AND INDEX_NAME = 'server_activities_user_timestamp_index') = 0,
	'ALTER TABLE `featherpanel_server_activities` ADD INDEX `server_activities_user_timestamp_index` (`user_id`, `timestamp`)',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;

SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_server_backups' AND INDEX_NAME = 'backups_server_deleted_created_index') = 0,
	'ALTER TABLE `featherpanel_server_backups` ADD INDEX `backups_server_deleted_created_index` (`server_id`, `deleted_at`, `created_at`)',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
