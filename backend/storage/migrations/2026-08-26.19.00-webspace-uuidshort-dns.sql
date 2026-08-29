-- WebSpace day-two: short UUID, DNS check columns
ALTER TABLE `featherpanel_webspaces`
	ADD COLUMN IF NOT EXISTS `uuidShort` CHAR(8) NULL AFTER `uuid`,
	ADD COLUMN IF NOT EXISTS `dns_status` VARCHAR(32) NULL DEFAULT NULL AFTER `ssl`,
	ADD COLUMN IF NOT EXISTS `dns_checked_at` TIMESTAMP NULL DEFAULT NULL AFTER `dns_status`;

UPDATE `featherpanel_webspaces`
SET `uuidShort` = LOWER(LEFT(REPLACE(`uuid`, '-', ''), 8))
WHERE `uuidShort` IS NULL OR `uuidShort` = '';

-- Make uuidShort required when present; ignore duplicate-key races on re-run
ALTER TABLE `featherpanel_webspaces`
	MODIFY `uuidShort` CHAR(8) NOT NULL;
