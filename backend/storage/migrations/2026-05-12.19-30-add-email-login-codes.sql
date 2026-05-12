-- Migration: Add email login (OTP) support
-- Created: 2026-05-12

ALTER TABLE `featherpanel_users`
    ADD COLUMN `email_login_code` VARCHAR(6) NULL DEFAULT NULL AFTER `two_fa_secret`,
    ADD COLUMN `email_login_expires` DATETIME NULL DEFAULT NULL AFTER `email_login_code`,
    ADD INDEX `users_email_login_code_index` (`email_login_code`),
    ADD INDEX `users_email_login_expires_index` (`email_login_expires`);
