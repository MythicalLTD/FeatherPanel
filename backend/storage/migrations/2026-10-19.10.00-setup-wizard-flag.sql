-- Existing installs (any user already present) skip the first-install setup wizard.
INSERT INTO `featherpanel_settings` (`name`, `value`)
SELECT 'setup_completed', 'true'
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `featherpanel_users`)
	AND NOT EXISTS (SELECT 1 FROM `featherpanel_settings` WHERE `name` = 'setup_completed');
