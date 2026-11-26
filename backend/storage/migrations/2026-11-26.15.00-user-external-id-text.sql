-- User external IDs come from billing systems and are often not numbers (e.g. "whmcs-12" or a UUID).
-- Existing numeric values are kept (converted to text).
ALTER TABLE `featherpanel_users` MODIFY COLUMN `external_id` VARCHAR(191) NULL DEFAULT NULL;
-- Unique when the existing data allows it; otherwise a plain index (the API refuses new duplicates).
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_users' AND COLUMN_NAME = 'external_id') > 0,
	'SELECT 1',
	IF(
		(SELECT COUNT(*) FROM (SELECT `external_id` FROM `featherpanel_users` WHERE `external_id` IS NOT NULL GROUP BY `external_id` HAVING COUNT(*) > 1) AS fp_dups) = 0,
		'ALTER TABLE `featherpanel_users` ADD UNIQUE INDEX `featherpanel_users_external_id_unique` (`external_id`)',
		'ALTER TABLE `featherpanel_users` ADD INDEX `featherpanel_users_external_id_index` (`external_id`)'
	)
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
