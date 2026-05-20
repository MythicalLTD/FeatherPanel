SET @column_exists = (
	SELECT COUNT(*)
	FROM INFORMATION_SCHEMA.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE()
		AND TABLE_NAME = 'featherpanel_server_custom_variables'
		AND COLUMN_NAME = 'is_encrypted'
);

SET @sql = IF(
	@column_exists = 0,
	'ALTER TABLE `featherpanel_server_custom_variables` ADD COLUMN `is_encrypted` tinyint (1) NOT NULL DEFAULT 0 AFTER `variable_value`',
	'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
