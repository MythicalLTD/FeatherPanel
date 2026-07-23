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

namespace App\Services\AbuseIPDB;

use App\App;
use GuzzleHttp\Client;
use App\Config\ConfigInterface;

class AbuseIPDBService
{
    /**
     * Official AbuseIPDB report categories (https://www.abuseipdb.com/categories).
     *
     * @var array<int, array{id: int, title: string, description: string}>
     */
    public const CATEGORIES = [
        ['id' => 1, 'title' => 'DNS Compromise', 'description' => 'Altering DNS records resulting in improper redirection.'],
        ['id' => 2, 'title' => 'DNS Poisoning', 'description' => 'Falsifying domain server cache (cache poisoning).'],
        ['id' => 3, 'title' => 'Fraud Orders', 'description' => 'Fraudulent orders.'],
        ['id' => 4, 'title' => 'DDoS Attack', 'description' => 'Participating in distributed denial-of-service (usually part of botnet).'],
        ['id' => 5, 'title' => 'FTP Brute-Force', 'description' => 'FTP credential brute-force attacks.'],
        ['id' => 6, 'title' => 'Ping of Death', 'description' => 'Oversized IP packet.'],
        ['id' => 7, 'title' => 'Phishing', 'description' => 'Phishing websites and/or email.'],
        ['id' => 8, 'title' => 'Fraud VoIP', 'description' => 'Fraudulent VoIP activity.'],
        ['id' => 9, 'title' => 'Open Proxy', 'description' => 'Open proxy, open relay, or Tor exit node.'],
        ['id' => 10, 'title' => 'Web Spam', 'description' => 'Comment/forum spam, HTTP referer spam, or other CMS spam.'],
        ['id' => 11, 'title' => 'Email Spam', 'description' => 'Spam email content, infected attachments, and phishing emails.'],
        ['id' => 12, 'title' => 'Blog Spam', 'description' => 'CMS blog comment spam.'],
        ['id' => 13, 'title' => 'VPN IP', 'description' => 'Conjunctive category for VPN IPs.'],
        ['id' => 14, 'title' => 'Port Scan', 'description' => 'Scanning for open ports and vulnerable services.'],
        ['id' => 15, 'title' => 'Hacking', 'description' => 'Hacking attempts.'],
        ['id' => 16, 'title' => 'SQL Injection', 'description' => 'Attempts at SQL injection.'],
        ['id' => 17, 'title' => 'Spoofing', 'description' => 'Email sender spoofing.'],
        ['id' => 18, 'title' => 'Brute-Force', 'description' => 'Credential brute-force attacks on webpage logins and services.'],
        ['id' => 19, 'title' => 'Bad Web Bot', 'description' => 'Webpage scraping and crawlers that do not honor robots.txt.'],
        ['id' => 20, 'title' => 'Exploited Host', 'description' => 'Host is likely infected with malware and being used for other attacks.'],
        ['id' => 21, 'title' => 'Web App Attack', 'description' => 'Attempts to probe for or exploit installed web applications.'],
        ['id' => 22, 'title' => 'SSH', 'description' => 'Secure Shell (SSH) abuse.'],
        ['id' => 23, 'title' => 'IoT Targeted', 'description' => 'Abuse targeted at an Internet of Things type device.'],
    ];
    private const API_BASE = 'https://api.abuseipdb.com/api/v2/';

    private Client $httpClient;

    public function __construct(?Client $httpClient = null)
    {
        $this->httpClient = $httpClient ?? new Client([
            'base_uri' => self::API_BASE,
            'timeout' => 15,
            'verify' => true,
            'http_errors' => false,
        ]);
    }

    public function isConfigured(): bool
    {
        $config = App::getInstance(true)->getConfig();

        return $config->getSetting(ConfigInterface::ABUSEIPDB_ENABLED, 'false') === 'true'
            && trim((string) $config->getSetting(ConfigInterface::ABUSEIPDB_API_KEY, '')) !== '';
    }

    public function getApiKey(): string
    {
        return trim((string) App::getInstance(true)->getConfig()->getSetting(ConfigInterface::ABUSEIPDB_API_KEY, ''));
    }

    public static function isPublicIp(string $ip): bool
    {
        $ip = trim($ip);
        if ($ip === '' || filter_var($ip, FILTER_VALIDATE_IP) === false) {
            return false;
        }

        return (bool) filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        );
    }

    /**
     * @return array{success: bool, data?: array<string, mixed>, error?: string, status?: int, rate_limit?: array<string, mixed>}
     */
    public function check(string $ip, ?int $maxAgeInDays = null, bool $verbose = false): array
    {
        $ip = trim($ip);
        if (!self::isPublicIp($ip)) {
            return [
                'success' => false,
                'error' => 'IP address is not a public address that can be checked',
                'status' => 400,
            ];
        }

        $apiKey = $this->getApiKey();
        if ($apiKey === '') {
            return [
                'success' => false,
                'error' => 'AbuseIPDB API key is not configured',
                'status' => 400,
            ];
        }

        $config = App::getInstance(true)->getConfig();
        if ($maxAgeInDays === null) {
            $maxAgeInDays = (int) $config->getSetting(ConfigInterface::ABUSEIPDB_MAX_AGE_DAYS, '90');
        }
        $maxAgeInDays = max(1, min(365, $maxAgeInDays));

        $query = [
            'ipAddress' => $ip,
            'maxAgeInDays' => $maxAgeInDays,
        ];
        if ($verbose) {
            $query['verbose'] = '';
        }

        try {
            $response = $this->httpClient->request('GET', 'check', [
                'query' => $query,
                'headers' => [
                    'Accept' => 'application/json',
                    'Key' => $apiKey,
                ],
            ]);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('AbuseIPDB check failed: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'AbuseIPDB request failed: ' . $e->getMessage(),
                'status' => 502,
            ];
        }

        return $this->parseJsonResponse($response);
    }

    /**
     * @param int[]|string $categories Category IDs (1-23)
     *
     * @return array{success: bool, data?: array<string, mixed>, error?: string, status?: int, rate_limit?: array<string, mixed>}
     */
    public function report(string $ip, array | string $categories, string $comment = '', ?string $timestamp = null): array
    {
        $ip = trim($ip);
        if (!self::isPublicIp($ip)) {
            return [
                'success' => false,
                'error' => 'IP address is not a public address that can be reported',
                'status' => 400,
            ];
        }

        $apiKey = $this->getApiKey();
        if ($apiKey === '') {
            return [
                'success' => false,
                'error' => 'AbuseIPDB API key is not configured',
                'status' => 400,
            ];
        }

        $categoryIds = $this->normalizeCategories($categories);
        if ($categoryIds === []) {
            return [
                'success' => false,
                'error' => 'At least one valid AbuseIPDB category is required',
                'status' => 400,
            ];
        }

        $form = [
            'ip' => $ip,
            'categories' => implode(',', $categoryIds),
        ];
        $comment = trim($comment);
        if ($comment !== '') {
            // AbuseIPDB comment max length is typically 1024
            $form['comment'] = mb_substr($comment, 0, 1024);
        }
        if ($timestamp !== null && trim($timestamp) !== '') {
            $form['timestamp'] = trim($timestamp);
        }

        try {
            $response = $this->httpClient->request('POST', 'report', [
                'form_params' => $form,
                'headers' => [
                    'Accept' => 'application/json',
                    'Key' => $apiKey,
                ],
            ]);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('AbuseIPDB report failed: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'AbuseIPDB report failed: ' . $e->getMessage(),
                'status' => 502,
            ];
        }

        return $this->parseJsonResponse($response);
    }

    /**
     * @param int[]|string $categories
     *
     * @return int[]
     */
    public function normalizeCategories(array | string $categories): array
    {
        if (is_string($categories)) {
            $categories = preg_split('/\s*,\s*/', $categories) ?: [];
        }

        $valid = [];
        foreach ($categories as $category) {
            $id = (int) $category;
            if ($id >= 1 && $id <= 23) {
                $valid[$id] = $id;
            }
        }

        return array_values($valid);
    }

    /**
     * @param \Psr\Http\Message\ResponseInterface $response
     *
     * @return array{success: bool, data?: array<string, mixed>, error?: string, status?: int, rate_limit?: array<string, mixed>}
     */
    private function parseJsonResponse($response): array
    {
        $status = $response->getStatusCode();
        $body = (string) $response->getBody();
        $payload = json_decode($body, true);
        $rateLimit = [
            'limit' => $response->getHeaderLine('X-RateLimit-Limit') ?: null,
            'remaining' => $response->getHeaderLine('X-RateLimit-Remaining') ?: null,
            'reset' => $response->getHeaderLine('X-RateLimit-Reset') ?: null,
            'retry_after' => $response->getHeaderLine('Retry-After') ?: null,
        ];

        if ($status >= 200 && $status < 300 && is_array($payload) && isset($payload['data'])) {
            return [
                'success' => true,
                'data' => is_array($payload['data']) ? $payload['data'] : [],
                'status' => $status,
                'rate_limit' => $rateLimit,
            ];
        }

        $error = 'AbuseIPDB request failed';
        if (is_array($payload) && isset($payload['errors']) && is_array($payload['errors'])) {
            $details = [];
            foreach ($payload['errors'] as $item) {
                if (is_array($item) && isset($item['detail'])) {
                    $details[] = (string) $item['detail'];
                }
            }
            if ($details !== []) {
                $error = implode('; ', $details);
            }
        }

        App::getInstance(true)->getLogger()->warning(
            'AbuseIPDB API error (HTTP ' . $status . '): ' . $error
        );

        return [
            'success' => false,
            'error' => $error,
            'status' => $status,
            'rate_limit' => $rateLimit,
        ];
    }
}
