ALTER TABLE `featherpanel_apikeys_client`
  ADD COLUMN `permissions` JSON NULL AFTER `allowed_ips`;
