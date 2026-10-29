-- Guarded with information_schema checks so it is safe to re-run and also works on MySQL 8.
-- Bring-your-own backup storage, OAuth providers: a destination is 'pending' while the user is on the
-- provider consent screen, and backups stored there keep the provider's file id in remote_ref.
ALTER TABLE `featherpanel_user_storage_destinations`
	MODIFY COLUMN `status` ENUM('pending', 'active', 'error', 'revoked') NOT NULL DEFAULT 'active';

SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_server_backups' AND COLUMN_NAME = 'remote_ref') = 0,
	'ALTER TABLE `featherpanel_server_backups` ADD COLUMN `remote_ref` VARCHAR(512) NULL DEFAULT NULL AFTER `destination_id`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
