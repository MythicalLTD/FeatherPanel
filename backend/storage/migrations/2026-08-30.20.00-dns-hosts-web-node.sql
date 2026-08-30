-- Node-hosted DNS (PowerDNS on FeatherQuilld web node).

ALTER TABLE `featherpanel_dns_hosts`
    ADD COLUMN `web_node_id` INT(11) NULL AFTER `account_id`,
    ADD KEY `featherpanel_dns_hosts_web_node_id` (`web_node_id`);
