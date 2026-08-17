ALTER TABLE `featherpanel_server_transfers`
ADD COLUMN `metadata` JSON DEFAULT NULL AFTER `error`;
