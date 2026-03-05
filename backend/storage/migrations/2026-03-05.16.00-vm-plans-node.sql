-- Tie VM plans to a specific VDS node
ALTER TABLE `featherpanel_vm_plans`
    ADD COLUMN IF NOT EXISTS `vm_node_id` int(11) DEFAULT NULL AFTER `id`;

-- Index for fast lookups per node
SET @exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'featherpanel_vm_plans'
      AND INDEX_NAME   = 'featherpanel_vm_plans_vm_node_id_idx'
);
SET @sql = IF(
    @exists = 0,
    'ALTER TABLE `featherpanel_vm_plans` ADD INDEX `featherpanel_vm_plans_vm_node_id_idx` (`vm_node_id`)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK to featherpanel_vm_nodes (ON DELETE SET NULL so deleting a node orphans plans gracefully)
SET @fk_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA    = DATABASE()
      AND TABLE_NAME      = 'featherpanel_vm_plans'
      AND CONSTRAINT_NAME = 'featherpanel_vm_plans_vm_node_id_foreign'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @fk_sql = IF(
    @fk_exists = 0,
    'ALTER TABLE `featherpanel_vm_plans` ADD CONSTRAINT `featherpanel_vm_plans_vm_node_id_foreign` FOREIGN KEY (`vm_node_id`) REFERENCES `featherpanel_vm_nodes` (`id`) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE fk_stmt FROM @fk_sql;
EXECUTE fk_stmt;
DEALLOCATE PREPARE fk_stmt;
