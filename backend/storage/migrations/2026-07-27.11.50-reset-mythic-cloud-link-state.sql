-- Reset Mythic/FeatherCloud link state after panel identity drift bugs.
-- This intentionally wipes only connection-specific state so panels re-link cleanly
-- after upgrading, while preserving feature flags and custom endpoint URLs.

DELETE FROM `featherpanel_settings`
WHERE `name` IN (
	'feathercloud_access_public_key',
	'feathercloud_access_private_key',
	'feathercloud_access_last_rotated',
	'feathercloud_cloud_public_key',
	'feathercloud_cloud_private_key',
	'feathercloud_cloud_last_rotated',
	'feathercloud_member_user_uuid',
	'feathercloud_team_uuid',
	'feathercloud_authorizer_mythic_user_id',
	'feathercloud_authorizer_feather_uuid',
	'feathercloud_member_map',
	'feathercloud_linked_at',
	'feathercloud_relink_pending_at',
	'feathercloud_cloud_id',
	'feathercloud_cloud_name',
	'feathercloud_team_name',
	'feathercloud_team_slug',
	'feathercloud_authorizer_email',
	'feathercloud_authorizer_name',
	'feathercloud_last_synced_at'
);

