-- Add unique constraint for LDAP provider + DN combination
ALTER TABLE `featherpanel_users`
  ADD UNIQUE KEY `featherpanel_users_ldap_provider_dn_unique` (`ldap_provider_uuid`, `ldap_dn`);
