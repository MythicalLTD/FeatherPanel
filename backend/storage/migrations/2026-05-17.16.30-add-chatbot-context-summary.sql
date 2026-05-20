ALTER TABLE `featherpanel_chatbot_conversations`
ADD COLUMN `context_summary` TEXT DEFAULT NULL AFTER `memory`,
ADD COLUMN `context_summary_updated_at` TIMESTAMP NULL DEFAULT NULL AFTER `context_summary`;
