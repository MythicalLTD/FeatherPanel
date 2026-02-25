-- Deduplicate (oidc_provider, oidc_subject) pairs: keep one row per pair (smallest id), delete the rest.
DELETE t1 FROM `featherpanel_users` t1
INNER JOIN `featherpanel_users` t2
  ON (t1.oidc_provider <=> t2.oidc_provider AND t1.oidc_subject <=> t2.oidc_subject AND t1.id > t2.id)
WHERE t1.oidc_provider IS NOT NULL AND t1.oidc_subject IS NOT NULL;

-- Prevent duplicate external identity bindings: one (oidc_provider, oidc_subject) per user.
ALTER TABLE `featherpanel_users`
ADD UNIQUE KEY `users_oidc_provider_subject_unique` (`oidc_provider`, `oidc_subject`);
