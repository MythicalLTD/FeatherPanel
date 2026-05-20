-- Ban / suspension metadata for staff visibility
ALTER TABLE `featherpanel_users`
ADD COLUMN `ban_reason` TEXT NULL DEFAULT NULL AFTER `banned`,
ADD COLUMN `banned_at` DATETIME NULL DEFAULT NULL AFTER `ban_reason`,
ADD COLUMN `banned_by_uuid` CHAR(36) NULL DEFAULT NULL AFTER `banned_at`;

ALTER TABLE `featherpanel_servers`
ADD COLUMN `suspension_reason` TEXT NULL DEFAULT NULL AFTER `suspended`,
ADD COLUMN `suspended_at` DATETIME NULL DEFAULT NULL AFTER `suspension_reason`,
ADD COLUMN `suspended_by_uuid` CHAR(36) NULL DEFAULT NULL AFTER `suspended_at`;
