ALTER TABLE `featherpanel_servers`
	ADD COLUMN `backup_retention_mode` VARCHAR(32) NULL DEFAULT NULL COMMENT 'NULL=inherit panel, hard_limit, fifo_rolling' AFTER `backup_limit`;

ALTER TABLE `featherpanel_vm_instances`
	ADD COLUMN `backup_retention_mode` VARCHAR(32) NULL DEFAULT NULL COMMENT 'NULL=inherit panel, hard_limit, fifo_rolling' AFTER `backup_limit`;

