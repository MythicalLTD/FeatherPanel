-- Custom startup commands are now off by default on new installs.
-- Existing installs (any user already present) that never saved this setting keep the old behaviour.
INSERT INTO `featherpanel_settings` (`name`, `value`)
SELECT 'server_allow_startup_change', 'true'
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `featherpanel_users`)
	AND NOT EXISTS (SELECT 1 FROM `featherpanel_settings` WHERE `name` = 'server_allow_startup_change');
