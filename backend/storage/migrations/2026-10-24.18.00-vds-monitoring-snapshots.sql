-- VDS snapshots: optional per-instance snapshot quota (NULL = use the panel default setting).
ALTER TABLE `featherpanel_vm_instances`
ADD COLUMN `snapshot_limit` INT NULL DEFAULT NULL;

-- VDS monitor: last seen state per instance, used by the cron to detect "went down"
-- transitions and sustained high CPU without re-alerting every run.
CREATE TABLE IF NOT EXISTS `featherpanel_vm_monitor_state` (
    `vm_instance_id` INT NOT NULL,
    `last_status` VARCHAR(16) NULL DEFAULT NULL,
    `cpu_high_since` DATETIME NULL DEFAULT NULL,
    `last_checked_at` DATETIME NULL DEFAULT NULL,
    PRIMARY KEY (`vm_instance_id`),
    CONSTRAINT `featherpanel_vm_monitor_state_instance_fk` FOREIGN KEY (`vm_instance_id`) REFERENCES `featherpanel_vm_instances` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
