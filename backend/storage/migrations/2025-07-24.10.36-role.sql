ALTER TABLE `mythicalpanel_users` DROP `role_id`;
ALTER TABLE `mythicalpanel_users` ADD `role_id` INT NOT NULL DEFAULT 1;
ALTER TABLE `mythicalpanel_users` ADD FOREIGN KEY (`role_id`) REFERENCES `mythicalpanel_roles` (`id`) ON DELETE CASCADE;