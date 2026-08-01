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

namespace App\Services\FeatherCloud;

use App\App;
use GuzzleHttp\Client;
use App\Config\ConfigInterface;
use GuzzleHttp\Exception\RequestException;

/**
 * Public HTTP client for Mythic Egg Catalog API (eggs.mythicalsystems.org).
 *
 * Read routes do NOT use CloudApiResponse. Prefer this host for catalog/download/list-reviews.
 * Egg review writes stay on FeatherCloudClient (panels.mythicalsystems.org).
 *
 * Source of truth: GET {base}/docs
 */
class MythicEggsClient
{
    public const DEFAULT_PROD_BASE_URL = 'https://eggs.mythicalsystems.org';
    public const DEFAULT_DEV_BASE_URL = 'https://eggs-dev.mythicalsystems.org';

    private Client $client;
    private string $baseUrl;

    public function __construct(?string $baseUrl = null, ?Client $client = null)
    {
        $configured = '';
        try {
            $configured = trim((string) (App::getInstance(true)->getConfig()->getSetting(ConfigInterface::FEATHERCLOUD_EGGS_BASE_URL, '') ?? ''));
        } catch (\Throwable) {
            $configured = '';
        }

        $resolved = $baseUrl ?? ($configured !== '' ? $configured : self::DEFAULT_PROD_BASE_URL);
        $this->baseUrl = rtrim($resolved, '/');
        $this->client = $client ?? new Client([
            'base_uri' => $this->baseUrl . '/',
            'timeout' => 30,
            'http_errors' => false,
            'headers' => [
                'Accept' => 'application/json',
                'User-Agent' => 'FeatherPanel-MythicEggsClient/1.0',
            ],
        ]);
    }

    public static function resolveBaseUrl(): string
    {
        try {
            $configured = trim((string) (App::getInstance(true)->getConfig()->getSetting(ConfigInterface::FEATHERCLOUD_EGGS_BASE_URL, '') ?? ''));

            return rtrim($configured !== '' ? $configured : self::DEFAULT_PROD_BASE_URL, '/');
        } catch (\Throwable) {
            return self::DEFAULT_PROD_BASE_URL;
        }
    }

    public function getBaseUrl(): string
    {
        return $this->baseUrl;
    }

    /**
     * @param array<string, mixed> $query
     *
     * @return array{data: list<array<string, mixed>>, meta: array<string, mixed>}
     */
    public function listEggs(array $query = []): array
    {
        $decoded = $this->getJson('eggs', $query);
        if (isset($decoded['data']) && is_array($decoded['data'])) {
            return [
                'data' => array_values(array_filter($decoded['data'], 'is_array')),
                'meta' => is_array($decoded['meta'] ?? null) ? $decoded['meta'] : [],
            ];
        }

        // GET /eggs.json style bare array
        if (array_is_list($decoded)) {
            return [
                'data' => array_values(array_filter($decoded, 'is_array')),
                'meta' => [],
            ];
        }

        throw new FeatherCloudException('Unexpected eggs list response shape', 'INVALID_RESPONSE', 502);
    }

    /**
     * @return array{data: array<string, mixed>, meta: array<string, mixed>}
     */
    public function getEgg(string | int $id): array
    {
        $decoded = $this->getJson('eggs/' . rawurlencode((string) $id));
        if (isset($decoded['error']) && is_string($decoded['error'])) {
            throw new FeatherCloudException($decoded['error'], 'EGG_NOT_FOUND', 404);
        }
        if (!isset($decoded['data']) || !is_array($decoded['data'])) {
            throw new FeatherCloudException('Unexpected egg detail response shape', 'INVALID_RESPONSE', 502);
        }

        return [
            'data' => $decoded['data'],
            'meta' => is_array($decoded['meta'] ?? null) ? $decoded['meta'] : [],
        ];
    }

    /**
     * @throws FeatherCloudException
     */
    public function downloadEgg(string | int $id): string
    {
        try {
            $response = $this->client->request('GET', 'eggs/' . rawurlencode((string) $id) . '/download', [
                'headers' => ['Accept' => 'application/json'],
            ]);
            $status = $response->getStatusCode();
            $body = $response->getBody()->getContents();
            $contentType = $response->getHeaderLine('Content-Type');

            if ($status === 429) {
                throw new FeatherCloudException('Mythic Eggs API rate limit exceeded', 'RATE_LIMITED', 429);
            }

            if ($status >= 400) {
                $decoded = json_decode($body, true);
                $message = is_array($decoded)
                    ? (string) ($decoded['error'] ?? ($decoded['message'] ?? 'Egg download failed'))
                    : 'Egg download failed';
                throw new FeatherCloudException($message, 'EGG_NOT_FOUND', $status === 404 ? 404 : $status);
            }

            if ($body === '' || (str_contains($contentType, 'application/json') && str_starts_with(ltrim($body), '{') && str_contains($body, '"error"'))) {
                $decoded = json_decode($body, true);
                if (is_array($decoded) && isset($decoded['error'])) {
                    throw new FeatherCloudException((string) $decoded['error'], 'EGG_NOT_FOUND', 404);
                }
            }

            return $body;
        } catch (FeatherCloudException $e) {
            throw $e;
        } catch (RequestException $e) {
            throw new FeatherCloudException('Mythic Eggs request failed: ' . $e->getMessage(), 'REQUEST_FAILED', 502);
        } catch (\Throwable $e) {
            throw new FeatherCloudException('Mythic Eggs error: ' . $e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    /**
     * Public egg reviews list camelCase meta (averageRating, reviewCount).
     *
     * @return array{data: list<array<string, mixed>>, meta: array<string, mixed>}
     */
    public function getEggReviews(string | int $id): array
    {
        $decoded = $this->getJson('eggs/' . rawurlencode((string) $id) . '/reviews');
        if (isset($decoded['error']) && is_string($decoded['error'])) {
            throw new FeatherCloudException($decoded['error'], 'EGG_NOT_FOUND', 404);
        }

        $list = [];
        if (isset($decoded['data']) && is_array($decoded['data'])) {
            $list = array_values(array_filter($decoded['data'], 'is_array'));
        }

        return [
            'data' => $list,
            'meta' => is_array($decoded['meta'] ?? null) ? $decoded['meta'] : [],
        ];
    }

    /**
     * @param array<string, mixed> $query
     *
     * @return array<string, mixed>
     */
    private function getJson(string $path, array $query = []): array
    {
        try {
            $options = [];
            if ($query !== []) {
                $options['query'] = $query;
            }

            $response = $this->client->request('GET', ltrim($path, '/'), $options);
            $status = $response->getStatusCode();
            $body = $response->getBody()->getContents();

            if ($status === 429) {
                throw new FeatherCloudException('Mythic Eggs API rate limit exceeded', 'RATE_LIMITED', 429);
            }

            if ($body === '') {
                throw new FeatherCloudException('Empty response from Mythic Eggs API', 'EMPTY_RESPONSE', $status);
            }

            $decoded = json_decode($body, true);
            if (!is_array($decoded)) {
                throw new FeatherCloudException('Invalid JSON from Mythic Eggs API', 'INVALID_JSON', $status);
            }

            if ($status >= 400) {
                $message = (string) ($decoded['error'] ?? ($decoded['message'] ?? 'Eggs API error'));
                $code = $status === 404 ? 'EGG_NOT_FOUND' : 'EGGS_ERROR';
                throw new FeatherCloudException($message, $code, $status);
            }

            return $decoded;
        } catch (FeatherCloudException $e) {
            throw $e;
        } catch (RequestException $e) {
            throw new FeatherCloudException('Mythic Eggs request failed: ' . $e->getMessage(), 'REQUEST_FAILED', 502);
        } catch (\Throwable $e) {
            throw new FeatherCloudException('Mythic Eggs error: ' . $e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }
}
