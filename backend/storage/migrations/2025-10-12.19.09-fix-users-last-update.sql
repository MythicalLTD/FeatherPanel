-- Automatically update `last_seen` to CURRENT_TIMESTAMP on any update to a user record
ALTER TABLE `featherpanel_users`
MODIFY COLUMN `last_seen` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
