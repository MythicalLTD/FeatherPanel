<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
