-- Add memory and message_count to conversations table
ALTER TABLE `featherpanel_chatbot_conversations`
ADD COLUMN `memory` TEXT DEFAULT NULL AFTER `title`,
ADD COLUMN `message_count` INT(11) NOT NULL DEFAULT 0 AFTER `memory`;

