-- WebPlate-seeded schedules can be locked so users cannot edit, toggle, or delete them.
ALTER TABLE `featherpanel_webspace_schedules`
	ADD COLUMN IF NOT EXISTS `is_locked` tinyint(1) NOT NULL DEFAULT 0 AFTER `is_processing`;

UPDATE `featherpanel_webspace_schedules`
SET `is_locked` = 1
WHERE `name` IN ('WordPress Cron', 'Nightly Backup', 'Laravel Scheduler', 'WHMCS Cron');
