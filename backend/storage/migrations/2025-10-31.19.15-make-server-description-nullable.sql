-- Make server description column nullable to allow optional descriptions
ALTER TABLE `featherpanel_servers` MODIFY COLUMN `description` TEXT NULL DEFAULT NULL;
