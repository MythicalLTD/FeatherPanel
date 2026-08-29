-- Web node reverse-proxy / ACME settings for FeatherQuilld
ALTER TABLE `featherpanel_web_nodes`
	ADD COLUMN IF NOT EXISTS `proxyEnabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `behind_proxy`,
	ADD COLUMN IF NOT EXISTS `proxyProvider` VARCHAR(16) NOT NULL DEFAULT 'caddy' AFTER `proxyEnabled`,
	ADD COLUMN IF NOT EXISTS `acmeEmail` VARCHAR(191) NULL DEFAULT NULL AFTER `proxyProvider`;
