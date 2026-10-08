-- OAuth2 device / serverless auth: allow pending grants without a user or callback,
-- and store device_code / user_code for RFC 8628-style polling.

ALTER TABLE `featherpanel_oauth2_api_authorizations`
	MODIFY COLUMN `user_uuid` CHAR(36) NULL DEFAULT NULL,
	MODIFY COLUMN `callback_url` TEXT NULL DEFAULT NULL,
	ADD COLUMN `device_code` VARCHAR(128) NULL DEFAULT NULL AFTER `request_token`,
	ADD COLUMN `user_code` VARCHAR(16) NULL DEFAULT NULL AFTER `device_code`,
	ADD UNIQUE KEY `oauth2_api_authorizations_device_code_unique` (`device_code`),
	ADD UNIQUE KEY `oauth2_api_authorizations_user_code_unique` (`user_code`);
