CREATE TABLE `featherpanel_addons` (
  `id` int(11) NOT NULL,
  `name` text NOT NULL,
  `enabled` enum('false','true') NOT NULL DEFAULT 'false',
  `deleted` enum('false','true') NOT NULL DEFAULT 'false',
  `locked` enum('false','true') NOT NULL DEFAULT 'false',
  `date` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `featherpanel_addons_settings` (
  `id` int(11) NOT NULL,
  `identifier` text NOT NULL,
  `key` text NOT NULL,
  `value` text NOT NULL,
  `locked` enum('false','true') NOT NULL DEFAULT 'false',
  `deleted` enum('false','true') NOT NULL DEFAULT 'false',
  `date` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `featherpanel_addons`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `featherpanel_addons_settings`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `featherpanel_addons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `featherpanel_addons_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;
