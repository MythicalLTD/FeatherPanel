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

use App\Helpers\XChaCha20;
use PHPUnit\Framework\TestCase;

class XChaCha20Test extends TestCase
{
    public function testGenerateStrongKeyReturnsHashedKey()
    {
        $key = XChaCha20::generateStrongKey(true);
        $this->assertNotEmpty($key);
        // Should be base64 encoded
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9+\/=]+$/', $key);
    }

    public function testGenerateStrongKeyReturnsRawKey()
    {
        $key = XChaCha20::generateStrongKey(false);
        $this->assertNotEmpty($key);
        $this->assertEquals(SODIUM_CRYPTO_SECRETBOX_KEYBYTES, strlen($key));
    }

    public function testCheckIfStrongKeyReturnsTrueForStrongKey()
    {
        $key = XChaCha20::generateStrongKey(true);
        $this->assertTrue(XChaCha20::checkIfStrongKey($key, true));
    }

    public function testCheckIfStrongKeyReturnsFalseForWeakKey()
    {
        $weakKey = base64_encode('short');
        $this->assertFalse(XChaCha20::checkIfStrongKey($weakKey, true));
    }

    public function testEncryptAndDecryptWithHashedKey()
    {
        $key = XChaCha20::generateStrongKey(true);
        $originalData = 'Sensitive information';

        $encrypted = XChaCha20::encrypt($originalData, $key, true);
        $this->assertNotEquals($originalData, $encrypted);

        $decrypted = XChaCha20::decrypt($encrypted, $key, true);
        $this->assertEquals($originalData, $decrypted);
    }

    public function testEncryptAndDecryptWithRawKey()
    {
        $key = XChaCha20::generateStrongKey(false);
        $originalData = 'Secret data';

        $encrypted = XChaCha20::encrypt($originalData, $key, false);
        $this->assertNotEquals($originalData, $encrypted);

        $decrypted = XChaCha20::decrypt($encrypted, $key, false);
        $this->assertEquals($originalData, $decrypted);
    }

    public function testEncryptProducesDifferentCiphertexts()
    {
        $key = XChaCha20::generateStrongKey(true);
        $data = 'Same data';

        // Due to random nonce, same data should produce different ciphertexts
        $encrypted1 = XChaCha20::encrypt($data, $key, true);
        $encrypted2 = XChaCha20::encrypt($data, $key, true);

        $this->assertNotEquals($encrypted1, $encrypted2);

        // But both should decrypt to the same value
        $this->assertEquals($data, XChaCha20::decrypt($encrypted1, $key, true));
        $this->assertEquals($data, XChaCha20::decrypt($encrypted2, $key, true));
    }

    public function testEncryptedDataIsBase64Encoded()
    {
        $key = XChaCha20::generateStrongKey(true);
        $encrypted = XChaCha20::encrypt('test', $key, true);

        // Should be valid base64
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9+\/=]+$/', $encrypted);
    }
}
