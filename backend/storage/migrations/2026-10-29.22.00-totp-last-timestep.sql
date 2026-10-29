-- TOTP replay protection: last accepted TOTP timestep per user, so a code cannot be used twice.
-- Guarded with an information_schema check so it is safe to re-run and also works on MySQL 8.
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_users' AND COLUMN_NAME = 'two_fa_last_timestep') = 0,
	'ALTER TABLE `featherpanel_users` ADD COLUMN `two_fa_last_timestep` bigint (20) DEFAULT NULL',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
