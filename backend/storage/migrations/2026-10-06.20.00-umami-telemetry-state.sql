CREATE TABLE IF NOT EXISTS `featherpanel_telemetry_state` (
    `service` VARCHAR(32) NOT NULL PRIMARY KEY,
    `last_attempt` BIGINT NULL DEFAULT NULL,
    `last_success` BIGINT NULL DEFAULT NULL,
    `last_result` VARCHAR(16) NULL DEFAULT NULL,
    `lease_token` VARCHAR(32) NULL DEFAULT NULL,
    `lease_until` BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `featherpanel_telemetry_state` (`service`) VALUES ('umami');
