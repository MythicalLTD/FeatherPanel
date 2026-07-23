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
 * Public HTTP client for Mythic Translations API (translate.mythicalsystems.org).
 * No panel keys required.
 *
 * Source of truth: GET {base}/docs
 */
class MythicTranslationsClient
{
    public const DEFAULT_PROD_BASE_URL = 'https://translate.mythicalsystems.org';
    public const DEFAULT_DEV_BASE_URL = 'https://translate-dev.mythicalsystems.org';
    public const DEFAULT_PROJECT = 'featherpanel';

    private Client $client;
    private string $baseUrl;

    public function __construct(?string $baseUrl = null, ?Client $client = null)
    {
        $configured = '';
        try {
            $configured = trim((string) (App::getInstance(true)->getConfig()->getSetting(ConfigInterface::FEATHERCLOUD_TRANSLATE_BASE_URL, '') ?? ''));
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
                'User-Agent' => 'FeatherPanel-MythicTranslationsClient/1.0',
            ],
        ]);
    }

    public static function resolveBaseUrl(): string
    {
        try {
            $configured = trim((string) (App::getInstance(true)->getConfig()->getSetting(ConfigInterface::FEATHERCLOUD_TRANSLATE_BASE_URL, '') ?? ''));

            return rtrim($configured !== '' ? $configured : self::DEFAULT_PROD_BASE_URL, '/');
        } catch (\Throwable) {
            return self::DEFAULT_PROD_BASE_URL;
        }
    }

    public function getBaseUrl(): string
    {
        return $this->baseUrl;
    }

    public function getDocs(): array
    {
        return $this->makeRequest('/docs');
    }

    public function listProjects(): array
    {
        return $this->makeRequest('/projects');
    }

    public function getProject(string $slug): array
    {
        return $this->makeRequest('/projects/' . rawurlencode($slug));
    }

    public function listLocales(string $slug): array
    {
        return $this->makeRequest('/projects/' . rawurlencode($slug) . '/locales');
    }

    /**
     * Locale JSON in API envelope: data.json = nested translations object.
     */
    public function getLocale(string $slug, string $locale): array
    {
        return $this->makeRequest(
            '/projects/' . rawurlencode($slug) . '/locales/' . rawurlencode($locale)
        );
    }

    /**
     * Download locale as raw JSON file body (attachment stream).
     *
     * @throws FeatherCloudException
     */
    public function downloadLocale(string $slug, string $locale): string
    {
        $path = 'projects/' . rawurlencode($slug) . '/locales/' . rawurlencode($locale) . '/download';

        try {
            $response = $this->client->request('GET', $path, [
                'headers' => ['Accept' => 'application/json'],
            ]);
            $status = $response->getStatusCode();
            $body = $response->getBody()->getContents();

            if ($status === 429) {
                throw new FeatherCloudException('Mythic Translations API rate limit exceeded', 'RATE_LIMITED', 429);
            }

            if ($status < 200 || $status >= 300) {
                $decoded = json_decode($body, true);
                $message = is_array($decoded)
                    ? (string) ($decoded['error_message'] ?? $decoded['message'] ?? 'Download failed')
                    : 'Translation locale download failed';
                $code = is_array($decoded) ? (string) ($decoded['error_code'] ?? 'DOWNLOAD_FAILED') : 'DOWNLOAD_FAILED';

                throw new FeatherCloudException($message, $code, $status);
            }

            if ($body === '') {
                throw new FeatherCloudException('Empty translation download', 'EMPTY_RESPONSE', $status);
            }

            return $body;
        } catch (FeatherCloudException $e) {
            throw $e;
        } catch (RequestException $e) {
            throw new FeatherCloudException('Mythic Translations request failed: ' . $e->getMessage(), 'REQUEST_FAILED', 502);
        } catch (\Throwable $e) {
            throw new FeatherCloudException('Mythic Translations error: ' . $e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function makeRequest(string $endpoint, string $method = 'GET', array $query = []): array
    {
        try {
            $options = [];
            if ($query !== []) {
                $options['query'] = $query;
            }

            $response = $this->client->request($method, ltrim($endpoint, '/'), $options);
            $status = $response->getStatusCode();
            $body = $response->getBody()->getContents();

            if ($status === 429) {
                throw new FeatherCloudException('Mythic Translations API rate limit exceeded', 'RATE_LIMITED', 429);
            }

            if ($body === '') {
                throw new FeatherCloudException('Empty response from Mythic Translations API', 'EMPTY_RESPONSE', $status);
            }

            $data = json_decode($body, true);
            if (!is_array($data)) {
                throw new FeatherCloudException('Invalid JSON from Mythic Translations API', 'INVALID_JSON', $status);
            }

            if ($status >= 400 || (($data['error'] ?? false) === true) || (($data['success'] ?? true) === false)) {
                $message = (string) ($data['error_message'] ?? $data['message'] ?? 'Translations API error');
                $code = (string) ($data['error_code'] ?? 'TRANSLATIONS_ERROR');

                throw new FeatherCloudException($message, $code, $status >= 400 ? $status : 422);
            }

            return is_array($data['data'] ?? null) ? $data['data'] : $data;
        } catch (FeatherCloudException $e) {
            throw $e;
        } catch (RequestException $e) {
            throw new FeatherCloudException('Mythic Translations request failed: ' . $e->getMessage(), 'REQUEST_FAILED', 502);
        } catch (\Throwable $e) {
            throw new FeatherCloudException('Mythic Translations error: ' . $e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }
}
