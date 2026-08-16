ALTER TABLE `featherpanel_nodes`
    ADD COLUMN `daemon_type` VARCHAR(32) NOT NULL DEFAULT 'featherwings' AFTER `daemonBase`;
