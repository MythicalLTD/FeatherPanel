<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

namespace App\Helpers;

class XChaCha20
{
    /**
     * Encrypt the data specified.
     *
     * @param string|array $data The data that should be encrypted!
     * @param string $key The key you want to encrypt the data with!
     * @param bool $isKeyHashed Is the key hashed in base64?
     *
     * @return string|array The encrypted data!
     */
    public static function encrypt(string | array $data, string $key, bool $isKeyHashed = true): string | array
    {
        $nonce = random_bytes(SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES);
        if ($isKeyHashed) {
            $key = base64_decode($key);
        }
        $encrypted = sodium_crypto_aead_xchacha20poly1305_ietf_encrypt($data, $nonce, $nonce, $key);

        return base64_encode($nonce . $encrypted);
    }

    /**
     * Decrypt the data specified.
     *
     * @param string|array $data the data that should be decrypted!
     * @param string $key The key you want to decrypt the data with!
     * @param bool $isKeyHashed Is the key hashed in base64?
     */
    public static function decrypt(string | array $data, string $key, bool $isKeyHashed = true): string | array
    {
        $data = base64_decode($data);
        if ($isKeyHashed) {
            $key = base64_decode($key);
        }
        $nonce = mb_substr($data, 0, SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES, '8bit');
        $encrypted = mb_substr($data, SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES, null, '8bit');

        return sodium_crypto_aead_xchacha20poly1305_ietf_decrypt($encrypted, $nonce, $nonce, $key);
    }

    /**
     * Check if the encryption key is strong.
     *
     * @param string $key The key
     * @param bool $isKeyHashed Is the key hashed in base64?
     */
    public static function checkIfStrongKey(string $key, bool $isKeyHashed): bool
    {
        if ($isKeyHashed) {
            $key = base64_decode($key);
        }

        return strlen($key) >= 32;
    }

    /**
     * Generate a strong key.
     *
     * @param bool $hash Should we hash the key in order so you can use it in the config?
     *
     * @return string The encryption key!
     */
    public static function generateStrongKey(bool $hash): string
    {
        if ($hash) {
            return base64_encode(sodium_crypto_secretbox_keygen());
        }

        return sodium_crypto_secretbox_keygen();
    }
}
