-- Optional map coordinates for locations (used by the admin node status map).
-- Guarded so the migration is safe to re-run on MySQL 8 / MariaDB.
SET @fp_loc_lat_exists := (
	SELECT COUNT(*)
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE()
	  AND TABLE_NAME = 'featherpanel_locations'
	  AND COLUMN_NAME = 'latitude'
);
SET @fp_loc_lat_sql := IF(
	@fp_loc_lat_exists = 0,
	'ALTER TABLE `featherpanel_locations` ADD `latitude` DECIMAL(10,7) NULL DEFAULT NULL AFTER `flag_code`, ADD `longitude` DECIMAL(10,7) NULL DEFAULT NULL AFTER `latitude`',
	'SELECT 1'
);
PREPARE fp_loc_lat_stmt FROM @fp_loc_lat_sql;
EXECUTE fp_loc_lat_stmt;
DEALLOCATE PREPARE fp_loc_lat_stmt;
