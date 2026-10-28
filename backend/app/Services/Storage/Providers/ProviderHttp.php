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

namespace App\Services\Storage\Providers;

use GuzzleHttp\Client;
use Psr\Http\Message\ResponseInterface;
use App\Services\Storage\StorageException;

/**
 * HTTP access to the fixed cloud provider APIs (Google, Dropbox, Microsoft).
 *
 * These hosts are hard coded, so they need no private-address pinning. For local testing only,
 * FEATHERPANEL_BYO_PROVIDER_MOCK_URL (e.g. http://127.0.0.1:9300) rewrites every provider URL to
 * <mock>/<original host><original path>, which is how the mock provider server is reached.
 */
final class ProviderHttp
{
    public const MOCK_ENV = 'FEATHERPANEL_BYO_PROVIDER_MOCK_URL';

    /** Test hook. */
    public static ?Client $client = null;

    public static function url(string $url): string
    {
        $mock = trim((string) (getenv(self::MOCK_ENV) ?: ''));
        if ($mock === '') {
            return $url;
        }
        $p = parse_url($url);
        if (!is_array($p) || empty($p['host'])) {
            return $url;
        }

        return rtrim($mock, '/') . '/' . $p['host'] . ($p['path'] ?? '/') . (isset($p['query']) ? '?' . $p['query'] : '');
    }

    /**
     * @param array<string, mixed> $options Guzzle request options
     */
    public static function request(string $method, string $url, array $options = []): ResponseInterface
    {
        $client = self::$client ?? new Client([
            'connect_timeout' => 10,
            'timeout' => 60,
            'http_errors' => false,
            'allow_redirects' => false,
        ]);
        try {
            return $client->request($method, self::url($url), $options + ['http_errors' => false]);
        } catch (\Throwable $e) {
            throw new StorageException('Could not reach the storage provider: ' . $e->getMessage(), 'PROVIDER_UNREACHABLE', 502);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public static function json(ResponseInterface $response): array
    {
        $data = json_decode((string) $response->getBody(), true);

        return is_array($data) ? $data : [];
    }

    /** A short, safe description of a failed provider response. */
    public static function describe(ResponseInterface $response): string
    {
        $data = self::json($response);
        $msg = $data['error_description'] ?? ($data['error']['message'] ?? ($data['error_summary'] ?? ($data['error'] ?? '')));
        if (is_array($msg)) {
            $msg = json_encode($msg);
        }
        $msg = trim((string) $msg);

        return 'HTTP ' . $response->getStatusCode() . ($msg !== '' ? ': ' . mb_substr($msg, 0, 200) : '');
    }
}
