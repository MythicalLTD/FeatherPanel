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

namespace App\Services\Pterodactyl;

/**
 * Decryptor class for Pterodactyl's AES-256-CBC encryption.
 *
 * This class implements Laravel-compatible encryption/decryption used by Pterodactyl Panel.
 * Laravel uses AES-256-CBC with HMAC-SHA256 for message authentication.
 *
 * Format: base64(iv (16 bytes) + encrypted_data + mac (32 bytes))
 */
class Decryptor
{
    /**
     * The encryption key to use for decryption and encryption.
     */
    private string $encryptionKey;

    /**
     * The hashed encryption key (SHA-256 hash of the original key).
     */
    private string $hashedKey;

    /**
     * The cipher method used for encryption/decryption.
     */
    private string $cipher = 'AES-256-CBC';

    /**
     * The length of the initialization vector (IV) in bytes.
     */
    private int $ivLength = 16;

    /**
     * The length of the MAC (Message Authentication Code) in bytes.
     */
    private int $macLength = 32;

    /**
     * Initialize the decryptor with an encryption key.
     *
     * @param string $encryptionKey The encryption key from Pterodactyl's .env file (APP_KEY)
     */
    public function __construct(string $encryptionKey)
    {
        $this->encryptionKey = $encryptionKey;
        // Laravel hashes the key with SHA-256 to get a 32-byte key for AES-256
        $this->hashedKey = hash('sha256', $encryptionKey, true);
    }

    /**
     * Decrypt data encrypted with Pterodactyl's AES-256-CBC encryption.
     *
     * @param string $encryptedData Base64-encoded encrypted data
     *
     * @throws \Exception If decryption fails or MAC verification fails
     *
     * @return string The decrypted plaintext
     */
    public function decrypt(string $encryptedData): string
    {
        // Decode base64 payload
        $payload = base64_decode($encryptedData, true);
        if ($payload === false) {
            throw new \Exception('Invalid base64 encoded data');
        }

        // Check minimum payload length (IV + MAC)
        $minLength = $this->ivLength + $this->macLength;
        if (strlen($payload) < $minLength) {
            throw new \Exception('Payload is too short to contain IV and MAC');
        }

        // Extract IV (first 16 bytes)
        $iv = substr($payload, 0, $this->ivLength);

        // Extract MAC (last 32 bytes)
        $mac = substr($payload, -$this->macLength);

        // Extract encrypted data (middle part)
        $encrypted = substr($payload, $this->ivLength, -$this->macLength);

        // Verify MAC (Laravel uses HMAC-SHA256 over IV + encrypted_data)
        $calculatedMac = hash_hmac('sha256', $iv . $encrypted, $this->hashedKey, true);
        if (!hash_equals($calculatedMac, $mac)) {
            throw new \Exception('MAC verification failed - data may be corrupted or tampered');
        }

        // Decrypt the data
        $decrypted = openssl_decrypt(
            $encrypted,
            $this->cipher,
            $this->hashedKey,
            OPENSSL_RAW_DATA,
            $iv
        );

        if ($decrypted === false) {
            throw new \Exception('Decryption failed: ' . openssl_error_string());
        }

        return $decrypted;
    }

    /**
     * Encrypt data using Pterodactyl's AES-256-CBC encryption format.
     *
     * @param string $plaintext The plaintext data to encrypt
     *
     * @throws \Exception If encryption fails
     *
     * @return string Base64-encoded encrypted data
     */
    public function encrypt(string $plaintext): string
    {
        // Generate random IV
        $iv = random_bytes($this->ivLength);

        // Encrypt the data
        $encrypted = openssl_encrypt(
            $plaintext,
            $this->cipher,
            $this->hashedKey,
            OPENSSL_RAW_DATA,
            $iv
        );

        if ($encrypted === false) {
            throw new \Exception('Encryption failed: ' . openssl_error_string());
        }

        // Calculate MAC (HMAC-SHA256 over IV + encrypted_data)
        $mac = hash_hmac('sha256', $iv . $encrypted, $this->hashedKey, true);

        // Concatenate IV + encrypted_data + MAC
        $payload = $iv . $encrypted . $mac;

        // Base64 encode the payload
        return base64_encode($payload);
    }
}
