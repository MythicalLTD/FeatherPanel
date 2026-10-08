ALTER TABLE `featherpanel_mail_hosts`
    ADD COLUMN `webmail_url` VARCHAR(512) NULL DEFAULT NULL AFTER `dkim_record`;
