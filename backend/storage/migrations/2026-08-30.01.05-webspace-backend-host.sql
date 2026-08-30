-- Optional per-WebSpace proxy upstream override (empty = use web node default)
ALTER TABLE `featherpanel_webspaces`
	ADD COLUMN IF NOT EXISTS `backend_host` VARCHAR(255) NOT NULL DEFAULT '' AFTER `backend_port`;
