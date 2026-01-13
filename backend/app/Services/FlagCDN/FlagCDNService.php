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
