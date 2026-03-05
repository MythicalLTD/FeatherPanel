-- Fix featherpanel_vm_instances:
--   • Replace user_id (int) with user_uuid (char 36) → FK to featherpanel_users.uuid
--   • Add vm_ip_id (int) → FK to featherpanel_vm_ips.id

ALTER TABLE `featherpanel_vm_instances`
    ADD COLUMN IF NOT EXISTS `user_uuid` char(36) DEFAULT NULL AFTER `vm_node_id`,
    ADD COLUMN IF NOT EXISTS `vm_ip_id`  int(11)  DEFAULT NULL AFTER `gateway`,
    ADD INDEX  IF NOT EXISTS `featherpanel_vm_instances_user_uuid_idx` (`user_uuid`),
    ADD INDEX  IF NOT EXISTS `featherpanel_vm_instances_vm_ip_id_idx`  (`vm_ip_id`);

-- Foreign keys: add only when the constraint does not already exist.
-- Each FK lives in its own ALTER TABLE to avoid multi-statement parser quirks.
SET @fk1 = (
    SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA  = DATABASE()
      AND CONSTRAINT_NAME    = 'featherpanel_vm_instances_user_uuid_foreign'
);
SET @sql1 = IF(@fk1 = 0,
    'ALTER TABLE `featherpanel_vm_instances`
     ADD CONSTRAINT `featherpanel_vm_instances_user_uuid_foreign`
     FOREIGN KEY (`user_uuid`) REFERENCES `featherpanel_users` (`uuid`) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

SET @fk2 = (
    SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME   = 'featherpanel_vm_instances_vm_ip_id_foreign'
);
SET @sql2 = IF(@fk2 = 0,
    'ALTER TABLE `featherpanel_vm_instances`
     ADD CONSTRAINT `featherpanel_vm_instances_vm_ip_id_foreign`
     FOREIGN KEY (`vm_ip_id`) REFERENCES `featherpanel_vm_ips` (`id`) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Migrate old user_id values → user_uuid if user_id column still exists
SET @has_uid = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'featherpanel_vm_instances'
      AND COLUMN_NAME  = 'user_id'
);
SET @mig = IF(@has_uid > 0,
    'UPDATE featherpanel_vm_instances i
     INNER JOIN featherpanel_users u ON u.id = i.user_id
     SET i.user_uuid = u.uuid
     WHERE i.user_id IS NOT NULL AND i.user_uuid IS NULL',
    'SELECT 1'
);
PREPARE stmtM FROM @mig;
EXECUTE stmtM;
DEALLOCATE PREPARE stmtM;

-- Drop old user_id column (with its FK/index) only if it still exists
ALTER TABLE `featherpanel_vm_instances`
    DROP FOREIGN KEY IF EXISTS `featherpanel_vm_instances_user_id_foreign`,
    DROP INDEX     IF EXISTS `featherpanel_vm_instances_user_id_foreign`,
    DROP INDEX     IF EXISTS `featherpanel_vm_instances_user_id_idx`,
    DROP COLUMN    IF EXISTS `user_id`;
