ALTER TABLE `featherpanel_mail_hosts`
    ADD COLUMN `webmail_sso_secret` TEXT NULL DEFAULT NULL AFTER `webmail_url`;
