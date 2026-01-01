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

namespace App\Services\FlagCDN;

use App\App;
use App\Cache\Cache;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class FlagCDNService
{
    private const FLAG_CDN_BASE_URL = 'https://flagcdn.com';
    private const COUNTRY_CODES_URL = 'https://flagcdn.com/en/codes.json';
    private const CACHE_KEY = 'flagcdn:country_codes';
    private const CACHE_TTL_MINUTES = 1440; // 24 hours

    /**
     * Get all country codes and names.
     *
     * @return array<string, string> Array of country codes => country names
     */
    public static function getCountryCodes(): array
    {
        // Try to get from cache first
        $cached = Cache::get(self::CACHE_KEY);
        if ($cached !== null) {
            return $cached;
        }

        try {
            $client = new Client([
                'timeout' => 10,
                'verify' => true,
            ]);

            $response = $client->get(self::COUNTRY_CODES_URL);
            $data = json_decode($response->getBody()->getContents(), true);

            if (is_array($data)) {
                // Cache the result for 24 hours
                Cache::put(self::CACHE_KEY, $data, self::CACHE_TTL_MINUTES);

                return $data;
            }

            App::getInstance(true)->getLogger()->error('Invalid response from FlagCDN API: expected array');

            return [];
        } catch (GuzzleException $e) {
            App::getInstance(true)->getLogger()->error('Failed to fetch country codes from FlagCDN: ' . $e->getMessage());

            return [];
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Unexpected error fetching country codes: ' . $e->getMessage());

            return [];
        }
    }

    /**
     * Get flag image URL for a country code.
     *
     * @param string $countryCode ISO 3166-1 alpha-2 country code (e.g., 'us', 'ua')
     * @param int $width Width of the flag in pixels (default: 16)
     * @param int $height Height of the flag in pixels (default: 12)
     *
     * @return string Flag image URL
     */
    public static function getFlagUrl(string $countryCode, int $width = 16, int $height = 12): string
    {
        $code = strtolower($countryCode);

        return self::FLAG_CDN_BASE_URL . '/' . $width . 'x' . $height . '/' . $code . '.png';
    }

    /**
     * Validate if a country code exists.
     *
     * @param string $countryCode ISO 3166-1 alpha-2 country code
     *
     * @return bool True if the country code is valid
     */
    public static function isValidCountryCode(string $countryCode): bool
    {
        $codes = self::getCountryCodes();

        return isset($codes[strtolower($countryCode)]);
    }

    /**
     * Get country name by code.
     *
     * @param string $countryCode ISO 3166-1 alpha-2 country code
     *
     * @return string|null Country name or null if not found
     */
    public static function getCountryName(string $countryCode): ?string
    {
        $codes = self::getCountryCodes();

        return $codes[strtolower($countryCode)] ?? null;
    }
}
