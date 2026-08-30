-- Proxy upstream + Docker publish bind addresses for WebSpace backends
ALTER TABLE `featherpanel_web_nodes`
	ADD COLUMN IF NOT EXISTS `proxyBackendHost` VARCHAR(255) NOT NULL DEFAULT '127.0.0.1' AFTER `backendPortMax`,
	ADD COLUMN IF NOT EXISTS `proxyBackendBindHost` VARCHAR(255) NOT NULL DEFAULT '127.0.0.1' AFTER `proxyBackendHost`;
