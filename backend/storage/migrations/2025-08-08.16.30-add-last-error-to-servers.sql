ALTER TABLE `mythicalpanel_servers` 
ADD COLUMN `last_error` text DEFAULT NULL AFTER `installed_at`; 