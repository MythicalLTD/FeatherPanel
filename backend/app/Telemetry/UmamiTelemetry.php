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

namespace App\Telemetry;

use App\App;
use GuzzleHttp\Client;
use App\Config\ConfigInterface;
use GuzzleHttp\ClientInterface;

/** Daily aggregate statistics without installation IDs. Never runs in the HTTP request path. */
final class UmamiTelemetry
{
    // Shared FeatherPanel collector for every installation.
    private const ENDPOINT = 'https://dynhost.mythical.systems';
    private const WEBSITE_ID = '71281b01-8c95-4fac-9f58-6d68aac179d7';

    public function __construct(
        private readonly ClientInterface $http,
        private readonly string $endpoint,
        private readonly string $websiteId,
        private readonly bool $enabled = true,
        private readonly ?\Closure $collector = null,
    ) {
    }

    /** Administrators may opt out; the shared collector cannot be overridden. */
    public static function configuration(
        \App\Config\ConfigFactory $config,
    ): array {
        $allowed =
            (!defined('TELEMETRY') || TELEMETRY)
            && filter_var(
                App::env('UMAMI_ENABLED', 'true'),
                FILTER_VALIDATE_BOOLEAN,
            );

        return [
            'enabled' => $allowed
                && filter_var(
                    $config->getSetting(ConfigInterface::TELEMETRY, 'true'),
                    FILTER_VALIDATE_BOOLEAN,
                ),
            'environment_disabled' => !$allowed,
            'configured' => self::validDestination(self::ENDPOINT, self::WEBSITE_ID),
            'endpoint' => self::ENDPOINT,
            'website_id' => self::WEBSITE_ID,
        ];
    }

    public static function fromApp(): ?self
    {
        return self::fromConfig(App::getInstance(true)->getConfig());
    }

    /** Called after the database scheduler acquires its lease. */
    public static function fromConfig(
        \App\Config\ConfigFactory $config,
        ?ClientInterface $http = null,
    ): ?self {
        $options = self::configuration($config);
        if (!$options['enabled'] || !$options['configured']) {
            return null;
        }

        return new self(
            $http ?? new Client(),
            $options['endpoint'],
            $options['website_id'],
        );
    }

    /** The exact flat event data sent to Umami, with no personal or configuration data. */
    public function preview(): array
    {
        $counts = $this->collector !== null ? ($this->collector)() : (new UmamiStatistics())->collect();

        return UmamiStatistics::sanitizeCounts($counts);
    }

    public function report(): bool
    {
        if (
            !$this->enabled
            || !self::validDestination($this->endpoint, $this->websiteId)
        ) {
            return false;
        }
        try {
            $response = $this->http->request(
                'POST',
                rtrim($this->endpoint, '/') . '/api/send',
                [
                    'headers' => [
                        'Accept' => 'application/json',
                        // Fixed collector-compatible header, never taken from a visitor or this host.
                        'User-Agent' => 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                    ],
                    'json' => [
                        'type' => 'event',
                        'payload' => [
                            'website' => $this->websiteId,
                            'hostname' => 'featherpanel',
                            'url' => '/telemetry',
                            'name' => 'telemetry.daily',
                            'language' => 'en',
                            'data' => $this->preview(),
                        ],
                    ],
                    'connect_timeout' => 2.0,
                    'timeout' => 5.0,
                    'http_errors' => false,
                    'allow_redirects' => false,
                ],
            );

            // Umami can return 200 without recording a rejected/bot event.
            $body = json_decode((string) $response->getBody(), true);

            return $response->getStatusCode() >= 200
                && $response->getStatusCode() < 300
                && is_array($body)
                && !empty($body['sessionId'])
                && !empty($body['visitId']);
        } catch (\Throwable) {
            return false;
        }
    }

    /** Atomic database lease prevents duplicate reports across cron workers/hosts. */
    public static function runScheduled(
        UmamiTelemetryState $state,
        \Closure $factory,
        ?int $now = null,
    ): bool {
        $token = null;
        try {
            $now ??= time();
            $token = $state->claim($now);
            if ($token === null) {
                return false;
            }
            // Re-read the toggle after acquiring the lease, before collecting any statistics.
            $telemetry = $factory();
            if (!$telemetry instanceof self || !$telemetry->enabled()) {
                return false;
            }
            if (!$state->attempt($token, $now)) {
                return false;
            }
            $success = $telemetry->report();
            $state->complete($token, $now, $success);

            return $success;
        } catch (\Throwable) {
            // Database/collection/transport failures must not interrupt other workers.
            return false;
        } finally {
            if ($token !== null) {
                try {
                    $state->release($token);
                } catch (\Throwable) {
                    // The lease expires automatically after a crashed/disconnected worker.
                }
            }
        }
    }

    public function enabled(): bool
    {
        return $this->enabled;
    }

    public static function validEndpoint(string $endpoint): bool
    {
        $url = parse_url($endpoint);

        return filter_var($endpoint, FILTER_VALIDATE_URL) !== false
            && is_array($url)
            && in_array($url['scheme'] ?? '', ['http', 'https'], true)
            && !isset($url['user'])
            && !isset($url['pass'])
            && !isset($url['query'])
            && !isset($url['fragment']);
    }

    public static function validWebsiteId(string $websiteId): bool
    {
        return preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
            $websiteId,
        ) === 1;
    }

    private static function validDestination(
        string $endpoint,
        string $websiteId,
    ): bool {
        return self::validEndpoint($endpoint)
            && self::validWebsiteId($websiteId);
    }
}
