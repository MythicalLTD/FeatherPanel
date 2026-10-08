-- Unique short UUID for WebSpaces (idempotent when index already exists on some engines)
ALTER TABLE `featherpanel_webspaces`
	ADD UNIQUE INDEX `featherpanel_webspaces_uuidShort_unique` (`uuidShort`);
