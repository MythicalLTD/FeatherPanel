-- Loopback backend port pool for WebSpace containers / static backends (system.proxy.backend_port_*)
ALTER TABLE `featherpanel_web_nodes`
	ADD COLUMN IF NOT EXISTS `backendPortMin` INT(10) UNSIGNED NOT NULL DEFAULT 20000 AFTER `acmeStaging`,
	ADD COLUMN IF NOT EXISTS `backendPortMax` INT(10) UNSIGNED NOT NULL DEFAULT 29999 AFTER `backendPortMin`;
