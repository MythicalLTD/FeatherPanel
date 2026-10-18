-- Indexes for the hot list queries (found by profiling with 300k activity rows):
--  * admin/user activity logs sort by created_at (full scan + filesort without it)
--  * per-user / per-server activity and backup lists filter then sort
ALTER TABLE `featherpanel_activity`
    ADD INDEX IF NOT EXISTS `activity_created_at_index` (`created_at`),
    ADD INDEX IF NOT EXISTS `activity_user_uuid_created_at_index` (`user_uuid`, `created_at`);

ALTER TABLE `featherpanel_server_activities`
    ADD INDEX IF NOT EXISTS `server_activities_server_timestamp_index` (`server_id`, `timestamp`),
    ADD INDEX IF NOT EXISTS `server_activities_user_timestamp_index` (`user_id`, `timestamp`);

ALTER TABLE `featherpanel_server_backups`
    ADD INDEX IF NOT EXISTS `backups_server_deleted_created_index` (`server_id`, `deleted_at`, `created_at`);
