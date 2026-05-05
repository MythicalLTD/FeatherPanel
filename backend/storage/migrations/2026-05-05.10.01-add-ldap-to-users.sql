-- Add LDAP identifier columns to users table
ALTER TABLE `featherpanel_users`
  ADD COLUMN `ldap_provider_uuid` CHAR(36) DEFAULT NULL AFTER `oidc_subject`,
  ADD COLUMN `ldap_dn` VARCHAR(512) DEFAULT NULL AFTER `ldap_provider_uuid`,
  ADD KEY `featherpanel_users_ldap_provider_uuid` (`ldap_provider_uuid`);
