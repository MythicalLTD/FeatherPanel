-- Add locale column to users table for language tracking
ALTER TABLE `featherpanel_users` 
ADD COLUMN `locale` VARCHAR(10) NOT NULL DEFAULT 'en' AFTER `email`;

-- Create index for efficient language analytics queries
CREATE INDEX `users_locale_index` ON `featherpanel_users` (`locale`);
