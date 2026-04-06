ALTER TABLE `featherpanel_apikeys_client`
ADD COLUMN `notify_foreign_ip` ENUM ('false', 'true') NOT NULL DEFAULT 'false' AFTER `allowed_ips`;
