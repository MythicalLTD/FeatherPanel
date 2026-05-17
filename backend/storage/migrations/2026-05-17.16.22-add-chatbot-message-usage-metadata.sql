ALTER TABLE `featherpanel_chatbot_messages`
ADD COLUMN `input_tokens` INT UNSIGNED DEFAULT NULL AFTER `model`,
ADD COLUMN `output_tokens` INT UNSIGNED DEFAULT NULL AFTER `input_tokens`,
ADD COLUMN `total_tokens` INT UNSIGNED DEFAULT NULL AFTER `output_tokens`,
ADD COLUMN `token_source` VARCHAR(32) DEFAULT NULL AFTER `total_tokens`,
ADD COLUMN `tool_activity` JSON DEFAULT NULL AFTER `token_source`,
ADD COLUMN `usage_json` JSON DEFAULT NULL AFTER `tool_activity`;
