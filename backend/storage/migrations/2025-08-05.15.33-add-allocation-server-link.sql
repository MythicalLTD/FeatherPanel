ALTER TABLE `featherpanel_allocations` 
ADD CONSTRAINT `allocations_server_id_foreign` 
FOREIGN KEY (`server_id`) REFERENCES `featherpanel_servers` (`id`) ON DELETE SET NULL; 