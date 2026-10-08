-- Widen password column for XChaCha20 ciphertext (was VARCHAR(191)).
ALTER TABLE `featherpanel_webspace_databases`
	MODIFY COLUMN `password` TEXT NOT NULL;
