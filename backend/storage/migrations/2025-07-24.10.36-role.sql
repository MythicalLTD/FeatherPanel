-- Only add the column if it does not exist, to avoid SQL errors if it is already present.
-- This block checks for the column and adds it only if missing.
SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'featherpanel_users'
    AND COLUMN_NAME = 'role_id'
);

-- If the column does not exist, add it.
SET @add_column := IF(@column_exists = 0,
  'ALTER TABLE `featherpanel_users` ADD COLUMN `role_id` INT NOT NULL DEFAULT 1;',
  'SELECT "Column role_id already exists"'
);

PREPARE stmt FROM @add_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add the foreign key constraint, but only if it does not already exist.
-- MariaDB/MySQL do not support "IF NOT EXISTS" for ADD CONSTRAINT directly.
-- So, use a conditional approach for safe migration.

-- Check if the foreign key already exists before adding it.
SET @fk_name := (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_NAME = 'featherpanel_users'
    AND COLUMN_NAME = 'role_id'
    AND REFERENCED_TABLE_NAME = 'featherpanel_roles'
    AND REFERENCED_COLUMN_NAME = 'id'
    AND CONSTRAINT_SCHEMA = DATABASE()
  LIMIT 1
);

-- Only add the constraint if it does not exist
SET @add_fk := IF(@fk_name IS NULL, 
  'ALTER TABLE `featherpanel_users` ADD CONSTRAINT `featherpanel_users_role_id_fk` FOREIGN KEY (`role_id`) REFERENCES `featherpanel_roles` (`id`) ON DELETE CASCADE;', 
  'SELECT "Foreign key already exists"'
);

PREPARE stmt2 FROM @add_fk;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;