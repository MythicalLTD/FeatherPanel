-- Guarded with information_schema checks so it is safe to re-run and also works on MySQL 8.
-- Note the server's users keep on an allocation (separate from the admin `notes`).
-- Cleared whenever the allocation leaves the server.
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_allocations' AND COLUMN_NAME = 'server_notes') = 0,
	'ALTER TABLE `featherpanel_allocations` ADD COLUMN `server_notes` VARCHAR(255) NULL DEFAULT NULL AFTER `notes`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
