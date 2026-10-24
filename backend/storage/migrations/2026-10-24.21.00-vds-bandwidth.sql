-- Monthly VDS traffic accounting (sampled by the ZVdsMonitor cron) and a per-VDS limit override.
CREATE TABLE IF NOT EXISTS `featherpanel_vm_bandwidth` (
    `vm_instance_id` INT NOT NULL,
    `period` CHAR(7) NOT NULL COMMENT 'YYYY-MM',
    `rx_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `tx_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `last_netin` BIGINT UNSIGNED NULL DEFAULT NULL,
    `last_netout` BIGINT UNSIGNED NULL DEFAULT NULL,
    `warned` TINYINT(1) NOT NULL DEFAULT 0,
    `action_taken` ENUM('none', 'notify', 'throttle', 'suspend') NOT NULL DEFAULT 'none',
    `throttle_backup` TEXT NULL DEFAULT NULL COMMENT 'JSON of the original net devices before throttling',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`vm_instance_id`, `period`),
    CONSTRAINT `featherpanel_vm_bandwidth_instance_fk` FOREIGN KEY (`vm_instance_id`) REFERENCES `featherpanel_vm_instances` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `featherpanel_vm_instances`
    ADD COLUMN `bandwidth_limit_gb` INT NULL DEFAULT NULL COMMENT 'NULL = panel default, 0 = unlimited' AFTER `iso_mode`;
