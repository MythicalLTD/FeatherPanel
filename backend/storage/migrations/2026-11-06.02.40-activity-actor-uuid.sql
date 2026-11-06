-- Real actor for impersonated actions: admin who performed the action while
-- acting as user_uuid. Null for normal (non-impersonated) activity.
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_activity' AND COLUMN_NAME = 'actor_uuid') = 0,
	'ALTER TABLE `featherpanel_activity` ADD COLUMN `actor_uuid` CHAR(36) DEFAULT NULL AFTER `user_uuid`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;

SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_activity' AND INDEX_NAME = 'idx_activity_actor_uuid') = 0,
	'ALTER TABLE `featherpanel_activity` ADD INDEX `idx_activity_actor_uuid` (`actor_uuid`)',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
