-- VDS scheduled tasks (auto reboot / auto snapshot with rotation) executed by the panel cron.
CREATE TABLE IF NOT EXISTS `featherpanel_vm_schedules` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `vm_instance_id` INT NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `action` ENUM('reboot', 'snapshot') NOT NULL,
    `frequency` ENUM('hourly', 'daily', 'weekly') NOT NULL DEFAULT 'daily',
    `minute` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `hour` TINYINT UNSIGNED NOT NULL DEFAULT 4,
    `weekday` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0 = Sunday ... 6 = Saturday (weekly only)',
    `keep` TINYINT UNSIGNED NOT NULL DEFAULT 3 COMMENT 'Automatic snapshots kept (snapshot action)',
    `enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `next_run_at` DATETIME NULL DEFAULT NULL,
    `last_run_at` DATETIME NULL DEFAULT NULL,
    `last_status` ENUM('ok', 'failed', 'skipped') NULL DEFAULT NULL,
    `last_error` VARCHAR(500) NULL DEFAULT NULL,
    `created_by` INT NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `featherpanel_vm_schedules_due` (`enabled`, `next_run_at`),
    CONSTRAINT `featherpanel_vm_schedules_instance_fk` FOREIGN KEY (`vm_instance_id`) REFERENCES `featherpanel_vm_instances` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
