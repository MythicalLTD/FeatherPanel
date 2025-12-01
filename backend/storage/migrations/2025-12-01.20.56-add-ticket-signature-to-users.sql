ALTER TABLE `featherpanel_users`
  ADD COLUMN IF NOT EXISTS `ticket_signature` TEXT NULL DEFAULT NULL AFTER `discord_oauth2_name`;

