-- Split web hosting node permissions off Wings admin.nodes.*.
-- 1) Roles with Wings node access get matching admin.web_nodes.*.
-- 2) Roles with webspaces view also get admin.web_nodes.view so mail/DNS/webspace
--    pickers keep working without needing Wings node rights.

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.web_nodes.view'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.nodes.view'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.web_nodes.view'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.web_nodes.create'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.nodes.create'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.web_nodes.create'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.web_nodes.edit'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.nodes.edit'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.web_nodes.edit'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.web_nodes.delete'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.nodes.delete'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.web_nodes.delete'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.web_nodes.view'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.webspaces.view'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.web_nodes.view'
	);
