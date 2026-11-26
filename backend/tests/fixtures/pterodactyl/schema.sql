-- Minimal Pterodactyl/Pelican-shaped schema for FeatherCli migrate CI.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `settings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(191) NOT NULL,
  `value` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `locations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `short` varchar(60) NOT NULL,
  `long` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `nests` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `author` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nests_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `eggs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `nest_id` int unsigned DEFAULT NULL,
  `author` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text,
  `features` json DEFAULT NULL,
  `docker_images` json DEFAULT NULL,
  `file_denylist` json DEFAULT NULL,
  `update_url` text,
  `config_files` text,
  `config_startup` text,
  `config_logs` text,
  `config_stop` varchar(191) DEFAULT NULL,
  `config_from` int unsigned DEFAULT NULL,
  `startup` text,
  `script_container` varchar(191) DEFAULT NULL,
  `copy_script_from` int unsigned DEFAULT NULL,
  `script_entry` varchar(191) DEFAULT NULL,
  `script_is_privileged` tinyint(1) NOT NULL DEFAULT 1,
  `script_install` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `force_outgoing_ip` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `eggs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `egg_variables` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `egg_id` int unsigned NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `env_variable` varchar(191) NOT NULL,
  `default_value` text NOT NULL,
  `user_viewable` tinyint(1) NOT NULL,
  `user_editable` tinyint(1) NOT NULL,
  `rules` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `nodes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `public` tinyint(1) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text,
  `location_id` int unsigned NOT NULL,
  `fqdn` varchar(191) NOT NULL,
  `scheme` varchar(191) NOT NULL DEFAULT 'https',
  `behind_proxy` tinyint(1) NOT NULL DEFAULT 0,
  `maintenance_mode` tinyint(1) NOT NULL DEFAULT 0,
  `memory` int NOT NULL,
  `memory_overallocate` int NOT NULL DEFAULT 0,
  `disk` int NOT NULL,
  `disk_overallocate` int NOT NULL DEFAULT 0,
  `upload_size` int NOT NULL DEFAULT 100,
  `daemon_token_id` char(16) NOT NULL,
  `daemon_token` text NOT NULL,
  `daemonListen` smallint unsigned NOT NULL DEFAULT 8080,
  `daemonSFTP` smallint unsigned NOT NULL DEFAULT 2022,
  `daemonBase` varchar(191) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nodes_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `database_hosts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `host` varchar(191) NOT NULL,
  `port` int NOT NULL,
  `username` varchar(191) NOT NULL,
  `password` text NOT NULL,
  `max_databases` int DEFAULT NULL,
  `node_id` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `allocations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `node_id` int unsigned NOT NULL,
  `ip` varchar(191) NOT NULL,
  `ip_alias` varchar(191) DEFAULT NULL,
  `port` int unsigned NOT NULL,
  `server_id` int unsigned DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `username` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `name_first` varchar(191) NOT NULL,
  `name_last` varchar(191) NOT NULL,
  `password` text NOT NULL,
  `remember_token` varchar(191) DEFAULT NULL,
  `language` char(5) NOT NULL DEFAULT 'en',
  `root_admin` tinyint(1) NOT NULL DEFAULT 0,
  `use_totp` tinyint(1) NOT NULL DEFAULT 0,
  `totp_secret` text,
  `external_id` varchar(191) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_uuid_unique` (`uuid`),
  UNIQUE KEY `users_username_unique` (`username`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_ssh_keys` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `name` varchar(191) NOT NULL,
  `fingerprint` varchar(191) NOT NULL,
  `public_key` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `servers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `external_id` varchar(191) DEFAULT NULL,
  `uuid` char(36) NOT NULL,
  `uuidShort` char(8) NOT NULL,
  `node_id` int unsigned NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text,
  `status` varchar(191) DEFAULT NULL,
  `skip_scripts` tinyint(1) NOT NULL DEFAULT 0,
  `owner_id` int unsigned NOT NULL,
  `memory` int NOT NULL,
  `swap` int NOT NULL,
  `disk` int NOT NULL,
  `io` int NOT NULL,
  `cpu` int NOT NULL,
  `threads` varchar(191) DEFAULT NULL,
  `oom_disabled` tinyint(1) NOT NULL DEFAULT 0,
  `allocation_id` int unsigned NOT NULL,
  `nest_id` int unsigned DEFAULT NULL,
  `egg_id` int unsigned NOT NULL,
  `startup` text NOT NULL,
  `image` varchar(191) NOT NULL,
  `allocation_limit` int DEFAULT NULL,
  `database_limit` int DEFAULT NULL,
  `backup_limit` int NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `installed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `servers_uuid_unique` (`uuid`),
  UNIQUE KEY `servers_uuidshort_unique` (`uuidShort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `server_variables` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `server_id` int unsigned NOT NULL,
  `variable_id` int unsigned NOT NULL,
  `variable_value` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `databases` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `server_id` int unsigned NOT NULL,
  `database_host_id` int unsigned NOT NULL,
  `database` varchar(191) NOT NULL,
  `username` varchar(191) NOT NULL,
  `remote` varchar(191) NOT NULL DEFAULT '%',
  `password` text NOT NULL,
  `max_connections` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `backups` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `server_id` int unsigned NOT NULL,
  `uuid` char(36) NOT NULL,
  `upload_id` text,
  `is_successful` tinyint(1) NOT NULL DEFAULT 0,
  `is_locked` tinyint(1) NOT NULL DEFAULT 0,
  `name` varchar(191) NOT NULL,
  `ignored_files` text NOT NULL,
  `disk` varchar(191) NOT NULL,
  `checksum` varchar(191) DEFAULT NULL,
  `bytes` bigint NOT NULL DEFAULT 0,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `backups_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `subusers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `server_id` int unsigned NOT NULL,
  `permissions` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `schedules` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `server_id` int unsigned NOT NULL,
  `name` varchar(191) NOT NULL,
  `cron_day_of_week` varchar(191) NOT NULL,
  `cron_month` varchar(191) NOT NULL,
  `cron_day_of_month` varchar(191) NOT NULL,
  `cron_hour` varchar(191) NOT NULL,
  `cron_minute` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `is_processing` tinyint(1) NOT NULL,
  `only_when_online` tinyint(1) NOT NULL DEFAULT 0,
  `last_run_at` timestamp NULL DEFAULT NULL,
  `next_run_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `schedule_id` int unsigned NOT NULL,
  `sequence_id` int NOT NULL,
  `action` varchar(191) NOT NULL,
  `payload` text NOT NULL,
  `time_offset` int NOT NULL,
  `is_queued` tinyint(1) NOT NULL,
  `continue_on_failure` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pterodactyl v2: nests replaced by tags (+ taggables pivot on eggs).
CREATE TABLE IF NOT EXISTS `tags` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `color` varchar(32) DEFAULT NULL,
  `legacy_nest_id` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tags_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `taggables` (
  `tag_id` int unsigned NOT NULL,
  `kind` varchar(20) NOT NULL DEFAULT 'egg',
  `taggable_type` varchar(50) NOT NULL,
  `taggable_id` int unsigned NOT NULL,
  PRIMARY KEY (`tag_id`, `taggable_type`, `taggable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
