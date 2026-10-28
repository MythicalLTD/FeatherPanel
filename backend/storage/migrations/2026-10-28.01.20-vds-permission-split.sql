-- Split VDS permissions off Wings admin.nodes.* without locking out existing roles.
-- Roles that already had game-node access get matching admin.vm_nodes.* / admin.vm_instances.*.

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.vm_nodes.view'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.nodes.view'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.vm_nodes.view'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.vm_nodes.create'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.nodes.create'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.vm_nodes.create'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.vm_nodes.edit'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.nodes.edit'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.vm_nodes.edit'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.vm_nodes.delete'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.nodes.delete'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.vm_nodes.delete'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.vm_instances.view'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.nodes.view'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.vm_instances.view'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.vm_instances.create'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.nodes.create'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.vm_instances.create'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.vm_instances.edit'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.nodes.edit'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.vm_instances.edit'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.vm_instances.delete'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.nodes.delete'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.vm_instances.delete'
	);
