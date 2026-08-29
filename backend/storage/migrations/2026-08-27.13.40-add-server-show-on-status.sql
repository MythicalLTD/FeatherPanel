ALTER TABLE `featherpanel_servers`
ADD COLUMN `show_on_status` TINYINT(1) NOT NULL DEFAULT 1 AFTER `skip_zerotrust`;
