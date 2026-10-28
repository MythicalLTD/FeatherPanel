-- Split mail/dns/hosting-packages off admin.webspaces.*, and abuseipdb/audit-log off admin.users.view.

-- Mail hosts from webspaces
INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.mail_hosts.view'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.webspaces.view'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.mail_hosts.view'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.mail_hosts.create'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.webspaces.create'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.mail_hosts.create'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.mail_hosts.edit'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.webspaces.edit'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.mail_hosts.edit'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.mail_hosts.delete'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.webspaces.delete'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.mail_hosts.delete'
	);

-- DNS hosts from webspaces
INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.dns_hosts.view'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.webspaces.view'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.dns_hosts.view'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.dns_hosts.create'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.webspaces.create'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.dns_hosts.create'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.dns_hosts.edit'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.webspaces.edit'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.dns_hosts.edit'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.dns_hosts.delete'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.webspaces.delete'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.dns_hosts.delete'
	);

-- Hosting packages from webspaces
INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.hosting_packages.view'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.webspaces.view'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.hosting_packages.view'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.hosting_packages.create'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.webspaces.create'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.hosting_packages.create'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.hosting_packages.edit'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.webspaces.edit'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.hosting_packages.edit'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.hosting_packages.delete'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.webspaces.delete'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.hosting_packages.delete'
	);

-- AbuseIPDB + audit log from users.view (admin.users.list is the view node value)
INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.abuseipdb.view'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.users.list'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.abuseipdb.view'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.abuseipdb.manage'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.users.list'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.abuseipdb.manage'
	);

INSERT INTO `featherpanel_permissions` (`role_id`, `permission`)
SELECT p.`role_id`, 'admin.audit_log.view'
FROM `featherpanel_permissions` p
WHERE p.`permission` = 'admin.users.list'
	AND NOT EXISTS (
		SELECT 1 FROM `featherpanel_permissions` x
		WHERE x.`role_id` = p.`role_id` AND x.`permission` = 'admin.audit_log.view'
	);
