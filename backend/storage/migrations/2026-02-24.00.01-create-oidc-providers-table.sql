CREATE TABLE `featherpanel_oidc_providers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `issuer_url` VARCHAR(255) NOT NULL,
  `client_id` VARCHAR(255) NOT NULL,
  `client_secret` TEXT NOT NULL,
  `scopes` VARCHAR(255) NOT NULL DEFAULT 'openid email profile',
  `email_claim` VARCHAR(255) NOT NULL DEFAULT 'email',
  `subject_claim` VARCHAR(255) NOT NULL DEFAULT 'sub',
  `group_claim` VARCHAR(255) DEFAULT NULL,
  `group_value` VARCHAR(255) DEFAULT NULL,
  `auto_provision` ENUM('true','false') NOT NULL DEFAULT 'false',
  `require_email_verified` ENUM('true','false') NOT NULL DEFAULT 'false',
  `enabled` ENUM('true','false') NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `featherpanel_oidc_providers_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

