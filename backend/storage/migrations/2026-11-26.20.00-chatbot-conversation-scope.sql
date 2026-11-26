-- Isolate chatbot conversations by product surface (server / VDS / WebSpace / dashboard).
ALTER TABLE `featherpanel_chatbot_conversations`
	ADD COLUMN `scope` ENUM('server', 'vds', 'webspace', 'dashboard') NOT NULL DEFAULT 'server' AFTER `user_uuid`,
	ADD KEY `conversations_user_scope_index` (`user_uuid`, `scope`);
