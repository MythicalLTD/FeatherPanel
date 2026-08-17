SET @exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'featherpanel_command_snippets'
      AND INDEX_NAME   = 'user_uuid_created_at_id'
);
SET @sql = IF(
    @exists = 0,
    'ALTER TABLE `featherpanel_command_snippets` ADD INDEX `user_uuid_created_at_id` (`user_uuid`, `created_at`, `id`)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
