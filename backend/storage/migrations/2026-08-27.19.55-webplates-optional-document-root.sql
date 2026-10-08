-- Document root is optional; blank means serve the WebSpace root (not forced "public").
ALTER TABLE `featherpanel_webplates`
	MODIFY COLUMN `document_root` VARCHAR(191) NOT NULL DEFAULT '';
