-- Migration: User self-service account deletion
-- Created: 2026-07-23

ALTER TABLE `featherpanel_users`
	ADD COLUMN `deletion_requested_at` DATETIME NULL DEFAULT NULL AFTER `deleted`,
	ADD COLUMN `deletion_scheduled_at` DATETIME NULL DEFAULT NULL AFTER `deletion_requested_at`,
	ADD COLUMN `deletion_mode` VARCHAR(32) NULL DEFAULT NULL AFTER `deletion_scheduled_at`,
	ADD COLUMN `account_deletion_otp` VARCHAR(6) NULL DEFAULT NULL AFTER `deletion_mode`,
	ADD COLUMN `account_deletion_otp_expires` DATETIME NULL DEFAULT NULL AFTER `account_deletion_otp`,
	ADD INDEX `users_deletion_scheduled_at_index` (`deletion_scheduled_at`),
	ADD INDEX `users_deletion_requested_at_index` (`deletion_requested_at`);

INSERT INTO `featherpanel_settings` (`name`, `value`)
VALUES
	('user_allow_account_deletion', 'false'),
	('user_account_deletion_mode', 'instant'),
	('user_account_deletion_delay_days', '7'),
	('user_account_deletion_verify_2fa', 'true'),
	('user_account_deletion_verify_email_otp', 'true')
ON DUPLICATE KEY UPDATE `name` = `name`;

DELETE FROM `featherpanel_mail_templates`
WHERE `featherpanel_mail_templates`.`name` IN ('account_deletion_otp', 'account_deletion_scheduled');

INSERT INTO
	`featherpanel_mail_templates` (
		`name`,
		`subject`,
		`body`,
		`deleted`,
		`locked`,
		`created_at`,
		`updated_at`
	)
VALUES
	(
		'account_deletion_otp',
		'Your account deletion code for {app_name}',
		'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Account Deletion Code</title></head><body style="background-color:#f4f4f4;color:#333;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;line-height:1.6;margin:0;padding:20px"><div style="background-color:#fff;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,.1);margin:0 auto;max-width:600px;overflow:hidden"><div style="background:linear-gradient(135deg,#c53030 0,#9b2c2c 100%);color:#fff;padding:40px 30px;text-align:center"><h1 style="font-size:28px;font-weight:600;margin:0 0 10px 0">Confirm Account Deletion</h1><p style="font-size:16px;opacity:.9;margin:0">This action is permanent</p></div><div style="padding:40px 30px"><div style="margin-bottom:30px;text-align:center"><h2 style="color:#2d3748;font-size:24px;margin:0 0 15px 0">Hello, {first_name} {last_name}</h2><p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0">Use this one-time code to confirm permanent deletion of your {app_name} account.</p></div><div style="background-color:#f7fafc;border:2px solid #e2e8f0;border-radius:8px;margin:30px 0;padding:30px;text-align:center"><h3 style="color:#2d3748;font-size:20px;margin:0 0 20px 0">Your verification code</h3><div style="background:linear-gradient(135deg,#c53030 0,#9b2c2c 100%);border-radius:8px;color:#fff;display:inline-block;font-size:36px;font-weight:700;letter-spacing:8px;padding:20px 40px">{otp_code}</div><p style="color:#4a5568;margin:25px 0 0 0;font-size:14px">This code will expire in {expires_minutes} minutes.</p></div><div style="background-color:#fff5f5;border:1px solid #fed7d7;border-radius:6px;margin:30px 0;padding:20px"><h4 style="color:#c53030;font-size:16px;margin:0 0 10px 0">Did not request this?</h4><p style="color:#4a5568;font-size:14px;line-height:1.5;margin:0">If you did not request account deletion, ignore this email and secure your account immediately.</p></div></div><div style="background-color:#f7fafc;border-top:1px solid #e2e8f0;padding:30px;text-align:center"><p style="color:#718096;font-size:14px;margin:0 0 10px 0">This email was sent to <b>{email}</b></p><p style="color:#718096;font-size:14px;margin:0 0 10px 0">© 2024-2026 {app_name}. All rights reserved.</p><p style="color:#718096;font-size:14px;margin:0"><a href="{support_url}" style="color:#c53030;text-decoration:none">Support</a></p></div></div></body></html>',
		'false',
		'false',
		'2026-07-23 14:00:00',
		'2026-07-23 14:00:00'
	),
	(
		'account_deletion_scheduled',
		'Your {app_name} account is scheduled for deletion',
		'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Account Deletion Scheduled</title></head><body style="background-color:#f4f4f4;color:#333;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;line-height:1.6;margin:0;padding:20px"><div style="background-color:#fff;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,.1);margin:0 auto;max-width:600px;overflow:hidden"><div style="background:linear-gradient(135deg,#c53030 0,#9b2c2c 100%);color:#fff;padding:40px 30px;text-align:center"><h1 style="font-size:28px;font-weight:600;margin:0 0 10px 0">Deletion Scheduled</h1><p style="font-size:16px;opacity:.9;margin:0">Your account will be permanently removed</p></div><div style="padding:40px 30px"><div style="margin-bottom:30px;text-align:center"><h2 style="color:#2d3748;font-size:24px;margin:0 0 15px 0">Hello, {first_name} {last_name}</h2><p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0">Your {app_name} account (<b>{username}</b>) is scheduled for permanent deletion.</p></div><div style="background-color:#f7fafc;border:2px solid #e2e8f0;border-radius:8px;margin:30px 0;padding:24px;text-align:center"><p style="color:#2d3748;font-size:16px;margin:0 0 8px 0"><b>Mode:</b> {deletion_mode_label}</p><p style="color:#2d3748;font-size:16px;margin:0"><b>Scheduled for:</b> {scheduled_at}</p></div><div style="background-color:#ebf8ff;border:1px solid #bee3f8;border-radius:6px;margin:30px 0;padding:20px"><h4 style="color:#2b6cb0;font-size:16px;margin:0 0 10px 0">Changed your mind?</h4><p style="color:#4a5568;font-size:14px;line-height:1.5;margin:0">Log in to your account before the scheduled time to cancel this deletion request.</p></div></div><div style="background-color:#f7fafc;border-top:1px solid #e2e8f0;padding:30px;text-align:center"><p style="color:#718096;font-size:14px;margin:0 0 10px 0">This email was sent to <b>{email}</b></p><p style="color:#718096;font-size:14px;margin:0 0 10px 0">© 2024-2026 {app_name}. All rights reserved.</p><p style="color:#718096;font-size:14px;margin:0"><a href="{support_url}" style="color:#c53030;text-decoration:none">Support</a></p></div></div></body></html>',
		'false',
		'false',
		'2026-07-23 14:00:00',
		'2026-07-23 14:00:00'
	);
