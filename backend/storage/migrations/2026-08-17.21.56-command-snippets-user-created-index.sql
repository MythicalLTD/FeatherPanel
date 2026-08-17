CREATE INDEX IF NOT EXISTS `user_uuid_created_at_id`
ON `featherpanel_command_snippets` (`user_uuid`, `created_at`, `id`);
