ALTER TABLE `featherpanel_users`
  ADD COLUMN `discord_oauth2_id` TEXT NULL DEFAULT NULL AFTER `remember_token`,
  ADD COLUMN `discord_oauth2_access_token` TEXT NULL DEFAULT NULL AFTER `discord_oauth2_id`,
  ADD COLUMN `discord_oauth2_linked` ENUM('false', 'true') NOT NULL DEFAULT 'false' AFTER `discord_oauth2_access_token`,
  ADD COLUMN `discord_oauth2_username` VARCHAR(255) NULL DEFAULT NULL AFTER `discord_oauth2_linked`,
  ADD COLUMN `discord_oauth2_name` VARCHAR(255) NULL DEFAULT NULL AFTER `discord_oauth2_username`;
