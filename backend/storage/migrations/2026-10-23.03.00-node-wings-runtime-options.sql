-- Guarded with information_schema checks so it is safe to re-run and also works on MySQL 8.
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_nodes' AND COLUMN_NAME = 'wings_check_install_exit_code') = 0,
	'ALTER TABLE `featherpanel_nodes` ADD COLUMN `wings_check_install_exit_code` TINYINT(1) NOT NULL DEFAULT 0 AFTER `fastdl_port`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
SET @fp_sql = IF(
	(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_nodes' AND COLUMN_NAME = 'wings_cpu_shares') = 0,
	'ALTER TABLE `featherpanel_nodes` ADD COLUMN `wings_cpu_shares` INT(10) UNSIGNED NOT NULL DEFAULT 1024 AFTER `wings_check_install_exit_code`',
	'SELECT 1'
);
PREPARE fp_stmt FROM @fp_sql;
EXECUTE fp_stmt;
DEALLOCATE PREPARE fp_stmt;
