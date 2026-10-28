-- Bring-your-own backup storage, OAuth providers: a destination is 'pending' while the user is on the
-- provider consent screen, and backups stored there keep the provider's file id in remote_ref.
ALTER TABLE `featherpanel_user_storage_destinations`
	MODIFY COLUMN `status` ENUM('pending', 'active', 'error', 'revoked') NOT NULL DEFAULT 'active';

ALTER TABLE `featherpanel_server_backups`
	ADD COLUMN `remote_ref` VARCHAR(512) NULL DEFAULT NULL AFTER `destination_id`;
