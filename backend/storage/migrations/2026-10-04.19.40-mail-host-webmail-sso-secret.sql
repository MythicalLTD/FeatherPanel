-- Guarded with information_schema checks so it is safe to re-run and also works on MySQL 8.
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_mail_hosts' AND COLUMN_NAME = 'webmail_sso_secret') = 0,
	'ALTER TABLE `featherpanel_mail_hosts` ADD COLUMN `webmail_sso_secret` TEXT NULL DEFAULT NULL AFTER `webmail_url`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
