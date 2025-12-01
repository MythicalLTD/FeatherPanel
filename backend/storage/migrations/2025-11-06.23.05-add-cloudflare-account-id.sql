ALTER TABLE `featherpanel_subdomain_manager_domains`
ADD COLUMN `cloudflare_account_id` VARCHAR(64) DEFAULT NULL AFTER `cloudflare_zone_id`;