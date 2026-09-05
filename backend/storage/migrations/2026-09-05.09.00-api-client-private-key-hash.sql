-- Add a deterministic lookup hash for API client private keys, so the
-- private_key column itself can be switched to encrypted-at-rest storage
-- without losing the ability to look up a client by the raw key a client
-- presents in the Authorization header (encrypted values are non-
-- deterministic per XChaCha20-Poly1305's random nonce, so WHERE private_key
-- = :value can no longer match once private_key holds ciphertext).
--
-- private_key_hash = SHA-256(plaintext private key), hex-encoded (64 chars).
-- This is a public, non-secret-preserving one-way index: knowing the hash
-- does not let anyone recover or forge the private key, exactly like an
-- OAuth/PAT lookup-hash design (GitHub, Stripe, etc. use the same pattern
-- for high-entropy API tokens).
ALTER TABLE `featherpanel_apikeys_client`
	ADD COLUMN `private_key_hash` CHAR(64) DEFAULT NULL AFTER `private_key`,
	ADD UNIQUE KEY `featherpanel_apikeys_client_private_key_hash_unique` (`private_key_hash`);
