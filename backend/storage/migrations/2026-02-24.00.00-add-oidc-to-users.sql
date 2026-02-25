ALTER TABLE `featherpanel_users`
  ADD COLUMN `oidc_provider` VARCHAR(255) NULL DEFAULT NULL AFTER `discord_oauth2_access_token`,
  ADD COLUMN `oidc_subject` TEXT NULL DEFAULT NULL AFTER `oidc_provider`,
  ADD COLUMN `oidc_email` TEXT NULL DEFAULT NULL AFTER `oidc_subject`;

