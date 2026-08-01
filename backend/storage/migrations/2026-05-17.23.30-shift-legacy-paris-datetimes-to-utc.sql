
-- Pin the session to UTC so any incidental `CURRENT_TIMESTAMP` (e.g. the
-- featherpanel_migrations bookkeeping row) is at least in UTC.
SET time_zone = '+00:00';

SET @migration_cutoff_utc = '2026-05-17 12:00:00';

-- -----------------------------------------------------------------------------
-- featherpanel_users first_seen + last_seen
-- -----------------------------------------------------------------------------
SET @cnt := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'featherpanel_users'
      AND COLUMN_NAME IN ('first_seen', 'last_seen')
);
SET @sql := IF(@cnt = 2,
    "UPDATE `featherpanel_users`
        SET `first_seen` = CONVERT_TZ(`first_seen`, 'SYSTEM', '+00:00'),
            `last_seen`  = CONVERT_TZ(`last_seen`,  'SYSTEM', '+00:00')
        WHERE (`first_seen` IS NOT NULL AND `first_seen` < @migration_cutoff_utc)
           OR (`last_seen`  IS NOT NULL AND `last_seen`  < @migration_cutoff_utc)",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- featherpanel_activity created_at + updated_at
-- -----------------------------------------------------------------------------
SET @cnt := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'featherpanel_activity'
      AND COLUMN_NAME IN ('created_at', 'updated_at')
);
SET @sql := IF(@cnt = 2,
    "UPDATE `featherpanel_activity`
        SET `created_at` = CONVERT_TZ(`created_at`, 'SYSTEM', '+00:00'),
            `updated_at` = CONVERT_TZ(`updated_at`, 'SYSTEM', '+00:00')
        WHERE (`created_at` IS NOT NULL AND `created_at` < @migration_cutoff_utc)
           OR (`updated_at` IS NOT NULL AND `updated_at` < @migration_cutoff_utc)",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- featherpanel_locations created_at + updated_at
-- -----------------------------------------------------------------------------
SET @cnt := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'featherpanel_locations'
      AND COLUMN_NAME IN ('created_at', 'updated_at')
);
SET @sql := IF(@cnt = 2,
    "UPDATE `featherpanel_locations`
        SET `created_at` = CONVERT_TZ(`created_at`, 'SYSTEM', '+00:00'),
            `updated_at` = CONVERT_TZ(`updated_at`, 'SYSTEM', '+00:00')
        WHERE (`created_at` IS NOT NULL AND `created_at` < @migration_cutoff_utc)
           OR (`updated_at` IS NOT NULL AND `updated_at` < @migration_cutoff_utc)",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- featherpanel_installed_plugins.installed_at (single column)
-- -----------------------------------------------------------------------------
SET @cnt := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'featherpanel_installed_plugins'
      AND COLUMN_NAME = 'installed_at'
);
SET @sql := IF(@cnt = 1,
    "UPDATE `featherpanel_installed_plugins`
        SET `installed_at` = CONVERT_TZ(`installed_at`, 'SYSTEM', '+00:00')
        WHERE `installed_at` IS NOT NULL AND `installed_at` < @migration_cutoff_utc",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- featherpanel_addons.date
-- -----------------------------------------------------------------------------
SET @cnt := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'featherpanel_addons'
      AND COLUMN_NAME = 'date'
);
SET @sql := IF(@cnt = 1,
    "UPDATE `featherpanel_addons`
        SET `date` = CONVERT_TZ(`date`, 'SYSTEM', '+00:00')
        WHERE `date` IS NOT NULL AND `date` < @migration_cutoff_utc",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- featherpanel_addons_settings.date
-- -----------------------------------------------------------------------------
SET @cnt := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'featherpanel_addons_settings'
      AND COLUMN_NAME = 'date'
);
SET @sql := IF(@cnt = 1,
    "UPDATE `featherpanel_addons_settings`
        SET `date` = CONVERT_TZ(`date`, 'SYSTEM', '+00:00')
        WHERE `date` IS NOT NULL AND `date` < @migration_cutoff_utc",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- featherpanel_settings.date
-- -----------------------------------------------------------------------------
SET @cnt := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'featherpanel_settings'
      AND COLUMN_NAME = 'date'
);
SET @sql := IF(@cnt = 1,
    "UPDATE `featherpanel_settings`
        SET `date` = CONVERT_TZ(`date`, 'SYSTEM', '+00:00')
        WHERE `date` IS NOT NULL AND `date` < @migration_cutoff_utc",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- Optional plugin: featherpanel_billingoxapay_logs.created_at
-- -----------------------------------------------------------------------------
SET @cnt := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'featherpanel_billingoxapay_logs'
      AND COLUMN_NAME = 'created_at'
);
SET @sql := IF(@cnt = 1,
    "UPDATE `featherpanel_billingoxapay_logs`
        SET `created_at` = CONVERT_TZ(`created_at`, 'SYSTEM', '+00:00')
        WHERE `created_at` IS NOT NULL AND `created_at` < @migration_cutoff_utc",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- Optional plugin: featherpanel_billingrazorpay_logs.created_at
-- -----------------------------------------------------------------------------
SET @cnt := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'featherpanel_billingrazorpay_logs'
      AND COLUMN_NAME = 'created_at'
);
SET @sql := IF(@cnt = 1,
    "UPDATE `featherpanel_billingrazorpay_logs`
        SET `created_at` = CONVERT_TZ(`created_at`, 'SYSTEM', '+00:00')
        WHERE `created_at` IS NOT NULL AND `created_at` < @migration_cutoff_utc",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- Optional plugin: pterodactyl-panel-api API key timestamps
-- -----------------------------------------------------------------------------
SET @cnt := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'featherpanel_pterodactylpanelapi_pterodactyl_api_key'
      AND COLUMN_NAME IN ('created_at', 'updated_at')
);
SET @sql := IF(@cnt = 2,
    "UPDATE `featherpanel_pterodactylpanelapi_pterodactyl_api_key`
        SET `created_at` = CONVERT_TZ(`created_at`, 'SYSTEM', '+00:00'),
            `updated_at` = CONVERT_TZ(`updated_at`, 'SYSTEM', '+00:00')
        WHERE (`created_at` IS NOT NULL AND `created_at` < @migration_cutoff_utc)
           OR (`updated_at` IS NOT NULL AND `updated_at` < @migration_cutoff_utc)",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- Optional plugin: minecraftplayermanager_logs.created_at
-- -----------------------------------------------------------------------------
SET @cnt := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'featherpanel_minecraftplayermanager_logs'
      AND COLUMN_NAME = 'created_at'
);
SET @sql := IF(@cnt = 1,
    "UPDATE `featherpanel_minecraftplayermanager_logs`
        SET `created_at` = CONVERT_TZ(`created_at`, 'SYSTEM', '+00:00')
        WHERE `created_at` IS NOT NULL AND `created_at` < @migration_cutoff_utc",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- Optional plugin suite: VM / VDS DATETIME defaults
-- -----------------------------------------------------------------------------

-- vm_creation_pending.created_at
SET @cnt := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_creation_pending' AND COLUMN_NAME = 'created_at');
SET @sql := IF(@cnt = 1,
    "UPDATE `featherpanel_vm_creation_pending`
        SET `created_at` = CONVERT_TZ(`created_at`, 'SYSTEM', '+00:00')
        WHERE `created_at` IS NOT NULL AND `created_at` < @migration_cutoff_utc",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- vm_instances.created_at + updated_at
SET @cnt := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_instances' AND COLUMN_NAME IN ('created_at','updated_at'));
SET @sql := IF(@cnt = 2,
    "UPDATE `featherpanel_vm_instances`
        SET `created_at` = CONVERT_TZ(`created_at`, 'SYSTEM', '+00:00'),
            `updated_at` = CONVERT_TZ(`updated_at`, 'SYSTEM', '+00:00')
        WHERE (`created_at` IS NOT NULL AND `created_at` < @migration_cutoff_utc)
           OR (`updated_at` IS NOT NULL AND `updated_at` < @migration_cutoff_utc)",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- vm_instance_ips.created_at + updated_at
SET @cnt := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_instance_ips' AND COLUMN_NAME IN ('created_at','updated_at'));
SET @sql := IF(@cnt = 2,
    "UPDATE `featherpanel_vm_instance_ips`
        SET `created_at` = CONVERT_TZ(`created_at`, 'SYSTEM', '+00:00'),
            `updated_at` = CONVERT_TZ(`updated_at`, 'SYSTEM', '+00:00')
        WHERE (`created_at` IS NOT NULL AND `created_at` < @migration_cutoff_utc)
           OR (`updated_at` IS NOT NULL AND `updated_at` < @migration_cutoff_utc)",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- vm_logs.created_at
SET @cnt := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_logs' AND COLUMN_NAME = 'created_at');
SET @sql := IF(@cnt = 1,
    "UPDATE `featherpanel_vm_logs`
        SET `created_at` = CONVERT_TZ(`created_at`, 'SYSTEM', '+00:00')
        WHERE `created_at` IS NOT NULL AND `created_at` < @migration_cutoff_utc",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- vm_nodes.created_at + updated_at
SET @cnt := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_nodes' AND COLUMN_NAME IN ('created_at','updated_at'));
SET @sql := IF(@cnt = 2,
    "UPDATE `featherpanel_vm_nodes`
        SET `created_at` = CONVERT_TZ(`created_at`, 'SYSTEM', '+00:00'),
            `updated_at` = CONVERT_TZ(`updated_at`, 'SYSTEM', '+00:00')
        WHERE (`created_at` IS NOT NULL AND `created_at` < @migration_cutoff_utc)
           OR (`updated_at` IS NOT NULL AND `updated_at` < @migration_cutoff_utc)",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- vm_ssh_keys.created_at + updated_at
SET @cnt := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_ssh_keys' AND COLUMN_NAME IN ('created_at','updated_at'));
SET @sql := IF(@cnt = 2,
    "UPDATE `featherpanel_vm_ssh_keys`
        SET `created_at` = CONVERT_TZ(`created_at`, 'SYSTEM', '+00:00'),
            `updated_at` = CONVERT_TZ(`updated_at`, 'SYSTEM', '+00:00')
        WHERE (`created_at` IS NOT NULL AND `created_at` < @migration_cutoff_utc)
           OR (`updated_at` IS NOT NULL AND `updated_at` < @migration_cutoff_utc)",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- vm_tasks.created_at + updated_at
SET @cnt := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_tasks' AND COLUMN_NAME IN ('created_at','updated_at'));
SET @sql := IF(@cnt = 2,
    "UPDATE `featherpanel_vm_tasks`
        SET `created_at` = CONVERT_TZ(`created_at`, 'SYSTEM', '+00:00'),
            `updated_at` = CONVERT_TZ(`updated_at`, 'SYSTEM', '+00:00')
        WHERE (`created_at` IS NOT NULL AND `created_at` < @migration_cutoff_utc)
           OR (`updated_at` IS NOT NULL AND `updated_at` < @migration_cutoff_utc)",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- vm_templates.created_at + updated_at
SET @cnt := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'featherpanel_vm_templates' AND COLUMN_NAME IN ('created_at','updated_at'));
SET @sql := IF(@cnt = 2,
    "UPDATE `featherpanel_vm_templates`
        SET `created_at` = CONVERT_TZ(`created_at`, 'SYSTEM', '+00:00'),
            `updated_at` = CONVERT_TZ(`updated_at`, 'SYSTEM', '+00:00')
        WHERE (`created_at` IS NOT NULL AND `created_at` < @migration_cutoff_utc)
           OR (`updated_at` IS NOT NULL AND `updated_at` < @migration_cutoff_utc)",
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
