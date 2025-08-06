ALTER TABLE `mythicalpanel_allocations` 
ADD CONSTRAINT `allocations_server_id_foreign` 
FOREIGN KEY (`server_id`) REFERENCES `mythicalpanel_servers` (`id`) ON DELETE SET NULL; 