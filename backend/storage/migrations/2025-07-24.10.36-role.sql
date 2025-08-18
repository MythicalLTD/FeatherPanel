ALTER TABLE `featherpanel_users` DROP `role_id`;
ALTER TABLE `featherpanel_users` ADD `role_id` INT NOT NULL DEFAULT 1;
ALTER TABLE `featherpanel_users` ADD FOREIGN KEY (`role_id`) REFERENCES `featherpanel_roles` (`id`) ON DELETE CASCADE;