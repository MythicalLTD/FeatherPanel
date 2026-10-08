-- DNS hosts: PowerDNS (node) only; remove legacy Cloudflare DNS host rows.

DELETE FROM `featherpanel_dns_hosts`
WHERE `provider` = 'cloudflare' OR `web_node_id` IS NULL;

UPDATE `featherpanel_dns_hosts` SET `provider` = 'node' WHERE `provider` <> 'node';

ALTER TABLE `featherpanel_dns_hosts`
    MODIFY COLUMN `provider` VARCHAR(32) NOT NULL DEFAULT 'node';
