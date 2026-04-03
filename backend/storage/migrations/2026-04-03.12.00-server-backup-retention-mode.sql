INSERT INTO `featherpanel_settings` (`name`, `value`, `date`)
VALUES ('server_backup_retention_mode', 'hard_limit', NOW())
ON DUPLICATE KEY UPDATE `name` = `name`;
