-- VDS ISO library: provider ISOs registered by admins (metadata + visibility) and ISOs
-- uploaded/downloaded by users into the admin-configured user ISO storage.
CREATE TABLE IF NOT EXISTS `featherpanel_vm_isos` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `kind` ENUM('provider', 'user') NOT NULL DEFAULT 'provider',
    `vm_node_id` INT NULL DEFAULT NULL COMMENT 'NULL = provider ISO offered on every VDS node',
    `pve_node` VARCHAR(64) NULL DEFAULT NULL,
    `storage` VARCHAR(64) NULL DEFAULT NULL,
    `volid` VARCHAR(255) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(500) NULL DEFAULT NULL,
    `category` VARCHAR(32) NOT NULL DEFAULT 'other',
    `visible` TINYINT(1) NOT NULL DEFAULT 1,
    `sort_order` INT NOT NULL DEFAULT 0,
    `user_id` INT NULL DEFAULT NULL,
    `vm_instance_id` INT NULL DEFAULT NULL,
    `source` ENUM('library', 'upload', 'url') NOT NULL DEFAULT 'library',
    `source_url` VARCHAR(2048) NULL DEFAULT NULL,
    `size_bytes` BIGINT NOT NULL DEFAULT 0,
    `status` ENUM('pending', 'ready', 'failed') NOT NULL DEFAULT 'ready',
    `approval` ENUM('approved', 'pending', 'rejected') NOT NULL DEFAULT 'approved',
    `upid` VARCHAR(255) NULL DEFAULT NULL,
    `error` VARCHAR(500) NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `featherpanel_vm_isos_kind_node` (`kind`, `vm_node_id`),
    KEY `featherpanel_vm_isos_user` (`user_id`),
    KEY `featherpanel_vm_isos_volid` (`volid`),
    CONSTRAINT `featherpanel_vm_isos_node_fk` FOREIGN KEY (`vm_node_id`) REFERENCES `featherpanel_vm_nodes` (`id`) ON DELETE CASCADE,
    CONSTRAINT `featherpanel_vm_isos_user_fk` FOREIGN KEY (`user_id`) REFERENCES `featherpanel_users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `featherpanel_vm_isos_instance_fk` FOREIGN KEY (`vm_instance_id`) REFERENCES `featherpanel_vm_instances` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- Per-VDS ISO policy override (NULL = use the panel setting vds_iso_mode).
ALTER TABLE `featherpanel_vm_instances`
ADD COLUMN `iso_mode` VARCHAR(16) NULL DEFAULT NULL;
