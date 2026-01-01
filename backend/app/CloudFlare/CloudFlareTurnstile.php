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

namespace App\CloudFlare;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class CloudFlareTurnstile
{
    /**
     * Validate a Cloudflare Turnstile response using Guzzle.
     *
     * @param string $response The user response token provided by the Turnstile widget
     * @param string $ip The user's IP address
     * @param string $secret_key Your Turnstile secret key
     *
     * @return bool True if validation is successful, false otherwise
     */
    public static function validate(string $response, string $ip, string $secret_key): bool
    {
        $client = new Client([
            'timeout' => 5.0,
        ]);

        $data = [
            'secret' => $secret_key,
            'response' => $response,
            'remoteip' => $ip,
        ];

        try {
            $res = $client->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                'form_params' => $data,
                'headers' => [
                    'Accept' => 'application/json',
                ],
            ]);
            $body = $res->getBody()->getContents();
            $result = json_decode($body, true);
            if (isset($result['success']) && $result['success'] === true) {
                return true;
            }
        } catch (GuzzleException $e) {
            // Log error if desired: $e->getMessage()
            return false;
        } catch (\Exception $e) {
            // Catch any other exceptions
            return false;
        }

        return false;
    }
}
