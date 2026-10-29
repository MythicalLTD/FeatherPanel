-- OAuth2 device / serverless auth: allow pending grants without a user or callback,
-- and store device_code / user_code for RFC 8628-style polling.

-- Guarded with information_schema checks so it is safe to re-run and also works on MySQL 8.
ALTER TABLE `featherpanel_oauth2_api_authorizations`
	MODIFY COLUMN `user_uuid` CHAR(36) NULL DEFAULT NULL,
	MODIFY COLUMN `callback_url` TEXT NULL DEFAULT NULL;

SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_oauth2_api_authorizations' AND COLUMN_NAME = 'device_code') = 0,
	'ALTER TABLE `featherpanel_oauth2_api_authorizations` ADD COLUMN `device_code` VARCHAR(128) NULL DEFAULT NULL AFTER `request_token`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_oauth2_api_authorizations' AND COLUMN_NAME = 'user_code') = 0,
	'ALTER TABLE `featherpanel_oauth2_api_authorizations` ADD COLUMN `user_code` VARCHAR(16) NULL DEFAULT NULL AFTER `device_code`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_oauth2_api_authorizations' AND INDEX_NAME = 'oauth2_api_authorizations_device_code_unique') = 0,
	'ALTER TABLE `featherpanel_oauth2_api_authorizations` ADD UNIQUE KEY `oauth2_api_authorizations_device_code_unique` (`device_code`)',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_oauth2_api_authorizations' AND INDEX_NAME = 'oauth2_api_authorizations_user_code_unique') = 0,
	'ALTER TABLE `featherpanel_oauth2_api_authorizations` ADD UNIQUE KEY `oauth2_api_authorizations_user_code_unique` (`user_code`)',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
