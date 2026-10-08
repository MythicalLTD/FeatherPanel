ALTER TABLE `featherpanel_users`
	ADD COLUMN `webspace_limit` INT(10) UNSIGNED NOT NULL DEFAULT 0 AFTER `id`;
