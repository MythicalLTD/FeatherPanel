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
