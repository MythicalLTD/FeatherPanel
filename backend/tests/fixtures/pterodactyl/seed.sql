-- Minimal seed for migrate CI (Pterodactyl-shaped).
INSERT INTO `settings` (`key`, `value`) VALUES
  ('app:name', 'CI Pterodactyl'),
  ('app:locale', 'en');

INSERT INTO `locations` (`id`, `short`, `long`, `created_at`, `updated_at`) VALUES
  (1, 'ci', 'CI Location', NOW(), NOW());

INSERT INTO `nests` (`id`, `uuid`, `author`, `name`, `description`, `created_at`, `updated_at`) VALUES
  (1, '11111111-1111-4111-8111-111111111111', 'ci@featherpanel.test', 'CI Nest', 'Nest for CI', NOW(), NOW());

INSERT INTO `eggs` (
  `id`, `uuid`, `nest_id`, `author`, `name`, `description`, `features`, `docker_images`,
  `file_denylist`, `startup`, `script_container`, `script_entry`, `script_is_privileged`,
  `script_install`, `force_outgoing_ip`, `created_at`, `updated_at`
) VALUES (
  1,
  '22222222-2222-4222-8222-222222222222',
  1,
  'ci@featherpanel.test',
  'CI Egg',
  'Egg for CI migrate',
  NULL,
  '{"ghcr.io/pterodactyl/yolks:java_21":"ghcr.io/pterodactyl/yolks:java_21"}',
  NULL,
  'java -jar {{SERVER_JARFILE}}',
  'ghcr.io/pterodactyl/installers:debian',
  'bash',
  1,
  '#!/bin/bash\necho install',
  0,
  NOW(),
  NOW()
);

INSERT INTO `egg_variables` (
  `id`, `egg_id`, `name`, `description`, `env_variable`, `default_value`,
  `user_viewable`, `user_editable`, `rules`, `created_at`, `updated_at`
) VALUES (
  1, 1, 'Server Jar File', 'The jar file', 'SERVER_JARFILE', 'server.jar',
  1, 1, 'required|string', NOW(), NOW()
);

INSERT INTO `nodes` (
  `id`, `uuid`, `public`, `name`, `description`, `location_id`, `fqdn`, `scheme`,
  `behind_proxy`, `maintenance_mode`, `memory`, `memory_overallocate`, `disk`, `disk_overallocate`,
  `upload_size`, `daemon_token_id`, `daemon_token`, `daemonListen`, `daemonSFTP`, `daemonBase`,
  `created_at`, `updated_at`
) VALUES (
  1,
  '33333333-3333-4333-8333-333333333333',
  1,
  'CI Node',
  'Node for CI',
  1,
  'node.ci.local',
  'https',
  0,
  0,
  8192,
  0,
  51200,
  0,
  100,
  'citokenid0000001',
  'citokensecretvalue0000000000001',
  8080,
  2022,
  '/var/lib/pterodactyl/volumes',
  NOW(),
  NOW()
);

INSERT INTO `allocations` (`id`, `node_id`, `ip`, `ip_alias`, `port`, `server_id`, `notes`, `created_at`, `updated_at`) VALUES
  (1, 1, '127.0.0.1', NULL, 25565, 1, 'primary', NOW(), NOW());

-- id=1 is panel root (skipped by importer); id=2 is migrated user.
INSERT INTO `users` (
  `id`, `uuid`, `username`, `email`, `name_first`, `name_last`, `password`,
  `remember_token`, `language`, `root_admin`, `use_totp`, `created_at`, `updated_at`
) VALUES
  (
    1,
    '44444444-4444-4444-8444-444444444441',
    'pteroadmin',
    'pteroadmin@example.com',
    'Ptero',
    'Admin',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    NULL,
    'en',
    1,
    0,
    NOW(),
    NOW()
  ),
  (
    2,
    '44444444-4444-4444-8444-444444444442',
    'pterouser',
    'pterouser@example.com',
    'Ptero',
    'User',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    NULL,
    'en',
    0,
    0,
    NOW(),
    NOW()
  );

INSERT INTO `servers` (
  `id`, `uuid`, `uuidShort`, `node_id`, `name`, `description`, `status`, `skip_scripts`,
  `owner_id`, `memory`, `swap`, `disk`, `io`, `cpu`, `threads`, `oom_disabled`,
  `allocation_id`, `nest_id`, `egg_id`, `startup`, `image`,
  `allocation_limit`, `database_limit`, `backup_limit`, `created_at`, `updated_at`, `installed_at`
) VALUES (
  1,
  '55555555-5555-4555-8555-555555555555',
  '55555555',
  1,
  'CI Minecraft',
  'Server for CI migrate',
  NULL,
  0,
  2,
  1024,
  0,
  5120,
  500,
  100,
  NULL,
  1,
  1,
  1,
  1,
  'java -jar {{SERVER_JARFILE}}',
  'ghcr.io/pterodactyl/yolks:java_21',
  0,
  0,
  0,
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO `server_variables` (`id`, `server_id`, `variable_id`, `variable_value`, `created_at`, `updated_at`) VALUES
  (1, 1, 1, 'server.jar', NOW(), NOW());
