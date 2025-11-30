-- Add user_downloadable column to knowledgebase article attachments
ALTER TABLE `featherpanel_knowledgebase_articles_attachments`
ADD COLUMN `user_downloadable` TINYINT (1) NOT NULL DEFAULT 0 AFTER `file_type`;

-- Add index for filtering downloadable attachments
ALTER TABLE `featherpanel_knowledgebase_articles_attachments` ADD KEY `knowledgebase_articles_attachments_user_downloadable_index` (`user_downloadable`);