-- FeatherTail host agent credentials on VDS / Proxmox nodes.
ALTER TABLE `featherpanel_vm_nodes`
	ADD COLUMN `feathertail_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `rescue_iso`,
	ADD COLUMN `feathertail_url` VARCHAR(512) NOT NULL DEFAULT '' AFTER `feathertail_enabled`,
	ADD COLUMN `feathertail_token` TEXT NULL DEFAULT NULL AFTER `feathertail_url`,
	ADD COLUMN `feathertail_tls_no_verify` TINYINT(1) NOT NULL DEFAULT 0 AFTER `feathertail_token`;
