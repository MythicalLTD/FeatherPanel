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
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Exception\RequestException;

/**
 * HTTP client for the Mythic Panel API (panels.mythicalsystems.org).
 *
 * Auth: X-Panel-Public-Key / X-Panel-Private-Key (FCPUB-… / FCPRIV-…).
 * Member actions also send X-Panel-User-Uuid when provided.
 *
 * Source of truth: GET {base}/docs
 */
class FeatherCloudClient
{
    public const DEFAULT_PROD_BASE_URL = 'https://panels.mythicalsystems.org';
    public const DEFAULT_DEV_BASE_URL = 'https://panels-dev.mythicalsystems.org';
    public const DEFAULT_OAUTH_URL = 'https://my.mythicalsystems.org/oauth2';

    private Client $client;
    private string $baseUrl;
    private string $panelPublicKey;
    private string $panelPrivateKey;
    private ?App $app;
    private ?string $memberUserUuid = null;

    /**
     * @param string|null $baseUrl Override API base (defaults to setting or prod)
     * @param Client|null $client Injected HTTP client (tests)
     * @param string|null $publicKey Override FCPUB identity key (tests)
     * @param string|null $privateKey Override FCPRIV identity key (tests)
     */
    public function __construct(
        ?string $baseUrl = null,
        ?Client $client = null,
        ?string $publicKey = null,
        ?string $privateKey = null,
    ) {
        $this->app = null;
        $configuredBase = '';

        // Injected credentials are for tests/mocks; otherwise load encrypted settings.
        if ($publicKey !== null || $privateKey !== null) {
            $this->panelPublicKey = trim((string) ($publicKey ?? ''));
            $this->panelPrivateKey = trim((string) ($privateKey ?? ''));
        } else {
            $this->app = App::getInstance(true);
            $config = $this->app->getConfig();

            $this->panelPublicKey = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, '') ?? ''));
            $this->panelPrivateKey = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, '') ?? ''));
            $configuredBase = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_API_BASE_URL, '') ?? ''));
        }

        $resolvedBase = $baseUrl ?? ($configuredBase !== '' ? $configuredBase : self::DEFAULT_PROD_BASE_URL);
        $this->baseUrl = rtrim($resolvedBase, '/');

        $this->client = $client ?? new Client([
            'base_uri' => $this->baseUrl . '/',
            'timeout' => 30,
            'http_errors' => false,
            'headers' => $this->defaultHeaders(),
        ]);
    }

    /**
     * Default production / configured Panel API base URL.
     */
    public static function resolveBaseUrl(): string
    {
        try {
            $configured = trim((string) (App::getInstance(true)->getConfig()->getSetting(ConfigInterface::FEATHERCLOUD_API_BASE_URL, '') ?? ''));

            return rtrim($configured !== '' ? $configured : self::DEFAULT_PROD_BASE_URL, '/');
        } catch (\Throwable) {
            return self::DEFAULT_PROD_BASE_URL;
        }
    }

    /**
     * OAuth link page on my.mythicalsystems.org (not www, not panels).
     */
    public static function resolveOAuthUrl(): string
    {
        try {
            $configured = trim((string) (App::getInstance(true)->getConfig()->getSetting(ConfigInterface::FEATHERCLOUD_OAUTH_URL, '') ?? ''));

            return rtrim($configured !== '' ? $configured : self::DEFAULT_OAUTH_URL, '/');
        } catch (\Throwable) {
            return self::DEFAULT_OAUTH_URL;
        }
    }

    public function getBaseUrl(): string
    {
        return $this->baseUrl;
    }

    /**
     * Set Mythic team member user id for review/issue actions.
     */
    public function withMemberUserUuid(?string $userUuid): self
    {
        $clone = clone $this;
        $clone->memberUserUuid = $userUuid !== null && trim($userUuid) !== '' ? trim($userUuid) : null;

        return $clone;
    }

    public function isConfigured(): bool
    {
        return $this->panelPublicKey !== '' && $this->panelPrivateKey !== '';
    }

    /**
     * Fetch live OpenAPI-style docs object (no auth).
     */
    public function getDocs(): array
    {
        return $this->makeRequest('/docs', 'GET', [], null, false);
    }

    public function getCloud(): array
    {
        return $this->makeRequest('/panel/cloud');
    }

    public function getTeam(): array
    {
        return $this->makeRequest('/panel/team');
    }

    public function getTeamMembers(int $page = 1, int $limit = 50): array
    {
        return $this->makeRequest('/panel/team/members', 'GET', ['page' => $page, 'limit' => $limit]);
    }

    public function getTotalCredits(): array
    {
        return $this->makeRequest('/panel/team/credits');
    }

    public function getPurchasedProducts(int $page = 1, int $limit = 50): array
    {
        return $this->makeRequest('/panel/products', 'GET', ['page' => $page, 'limit' => $limit]);
    }

    public function getMemberProducts(string $userUuid, int $page = 1, int $limit = 50): array
    {
        return $this->makeRequest('/panel/members/' . rawurlencode($userUuid) . '/products', 'GET', [
            'page' => $page,
            'limit' => $limit,
        ]);
    }

    public function getMember(string $userUuid): array
    {
        return $this->makeRequest('/panel/members/' . rawurlencode($userUuid));
    }

    public function getSummary(): array
    {
        return $this->makeRequest('/panel/summary');
    }

    public function getProductReleases(string $slug): array
    {
        return $this->makeRequest('/panel/products/' . rawurlencode($slug) . '/releases');
    }

    /**
     * Download a marketplace product release (.fpa).
     *
     * @throws FeatherCloudException
     */
    public function downloadProductRelease(string $slug, string $version): string
    {
        return $this->downloadBinary(
            '/panel/products/' . rawurlencode($slug) . '/releases/' . rawurlencode($version) . '/download'
        );
    }

    /**
     * Legacy alias for product release download.
     *
     * @throws FeatherCloudException
     */
    public function downloadPremiumPackage(string $packageName, string $version): string
    {
        try {
            return $this->downloadProductRelease($packageName, $version);
        } catch (FeatherCloudException $e) {
            // Fall back to legacy path if the new releases route is unavailable.
            if (in_array($e->getHttpStatusCode(), [404, 405], true)) {
                return $this->downloadBinary(
                    '/panel/packages/' . rawurlencode($packageName) . '/premium/download/' . rawurlencode($version)
                );
            }

            throw $e;
        }
    }

    public function getProductReviews(string $slug): array
    {
        return $this->makeRequest('/panel/products/' . rawurlencode($slug) . '/reviews', 'GET', [], null, false);
    }

    public function createProductReview(string $slug, array $body): array
    {
        return $this->makeRequest('/panel/products/' . rawurlencode($slug) . '/reviews', 'POST', [], $body, true, true);
    }

    public function deleteProductReview(string $slug, string | int $reviewId): array
    {
        return $this->makeRequest(
            '/panel/products/' . rawurlencode($slug) . '/reviews/' . rawurlencode((string) $reviewId),
            'DELETE',
            [],
            null,
            true,
            true
        );
    }

    public function listEggs(array $query = []): array
    {
        return $this->makeRequest('/eggs', 'GET', $query, null, false);
    }

    public function getEgg(string | int $id): array
    {
        return $this->makeRequest('/eggs/' . rawurlencode((string) $id), 'GET', [], null, false);
    }

    /**
     * @throws FeatherCloudException
     */
    public function downloadEgg(string | int $id): string
    {
        return $this->downloadBinary('/eggs/' . rawurlencode((string) $id) . '/download', false);
    }

    public function getEggReviews(string | int $id): array
    {
        return $this->makeRequest('/eggs/' . rawurlencode((string) $id) . '/reviews', 'GET', [], null, false);
    }

    public function createEggReview(string | int $id, array $body): array
    {
        return $this->makeRequest('/eggs/' . rawurlencode((string) $id) . '/reviews', 'POST', [], $body, true, true);
    }

    public function deleteEggReview(string | int $id): array
    {
        return $this->makeRequest('/eggs/' . rawurlencode((string) $id) . '/reviews', 'DELETE', [], null, true, true);
    }

    public function createPaste(array $body): array
    {
        return $this->makeRequest('/log', 'POST', [], $body);
    }

    public function getPaste(string $id): array
    {
        return $this->makeRequest('/log/' . rawurlencode($id), 'GET', [], null, false);
    }

    public function getPasteRaw(string $id): string
    {
        return $this->downloadBinary('/raw/' . rawurlencode($id), false);
    }

    public function deletePaste(string $id): array
    {
        return $this->makeRequest('/log/' . rawurlencode($id), 'DELETE');
    }

    public function listIssueProjects(): array
    {
        return $this->makeRequest('/panel/issues/projects');
    }

    public function listIssues(string $project, array $query = []): array
    {
        return $this->makeRequest('/panel/issues/' . rawurlencode($project), 'GET', $query);
    }

    public function createIssue(string $project, array $body): array
    {
        return $this->makeRequest('/panel/issues/' . rawurlencode($project), 'POST', [], $body, true, true);
    }

    public function getIssue(string $project, string | int $number): array
    {
        return $this->makeRequest('/panel/issues/' . rawurlencode($project) . '/' . rawurlencode((string) $number));
    }

    public function commentOnIssue(string $project, string | int $number, array $body): array
    {
        return $this->makeRequest(
            '/panel/issues/' . rawurlencode($project) . '/' . rawurlencode((string) $number) . '/comments',
            'POST',
            [],
            $body,
            true,
            true
        );
    }

    /**
     * @throws FeatherCloudException
     */
    private function downloadBinary(string $path, bool $requireAuth = true): string
    {
        if ($requireAuth && !$this->isConfigured()) {
            throw new FeatherCloudException('Mythic Panel API credentials are not configured', 'CREDENTIALS_NOT_CONFIGURED', 503);
        }

        try {
            $options = [
                'headers' => $this->requestHeaders($requireAuth, false),
            ];

            $this->log('Downloading binary: ' . $path);

            $response = $this->client->request('GET', ltrim($path, '/'), $options);
            $statusCode = $response->getStatusCode();
            $contentType = $response->getHeaderLine('Content-Type');
            $body = $response->getBody()->getContents();

            if ($statusCode === 429) {
                throw new FeatherCloudException('Mythic Panel API rate limit exceeded', 'RATE_LIMITED', 429);
            }

            if ($statusCode >= 400 || (str_contains($contentType, 'application/json') && $body !== '')) {
                $errorData = json_decode($body, true);
                if (is_array($errorData) && isset($errorData['success']) && $errorData['success'] !== true) {
                    $message = $errorData['message'] ?? ($errorData['error_message'] ?? 'Download failed');
                    $errorCode = is_string($errorData['error_code'] ?? null)
                        ? $errorData['error_code']
                        : (is_string($errorData['error'] ?? null) ? $errorData['error'] : 'DOWNLOAD_FAILED');
                    throw new FeatherCloudException($message, $errorCode, $statusCode);
                }

                if ($statusCode >= 400) {
                    throw new FeatherCloudException('Download failed with HTTP ' . $statusCode, 'DOWNLOAD_FAILED', $statusCode);
                }
            }

            return $body;
        } catch (FeatherCloudException $e) {
            throw $e;
        } catch (RequestException $e) {
            $statusCode = $e->hasResponse() ? $e->getResponse()->getStatusCode() : 500;
            $responseBody = $e->hasResponse() ? $e->getResponse()->getBody()->getContents() : '';
            $errorData = json_decode($responseBody, true);
            $message = is_array($errorData)
                ? ($errorData['message'] ?? ($errorData['error_message'] ?? $e->getMessage()))
                : $e->getMessage();
            $errorCode = is_array($errorData)
                ? (is_string($errorData['error_code'] ?? null) ? $errorData['error_code'] : 'DOWNLOAD_FAILED')
                : 'DOWNLOAD_FAILED';

            $this->log('Binary download failed: ' . $message . ' (path: ' . $path . ', status: ' . $statusCode . ')', true);

            throw new FeatherCloudException($message, $errorCode, $statusCode);
        } catch (GuzzleException $e) {
            throw new FeatherCloudException('Failed to download from Mythic Panel API: ' . $e->getMessage(), 'CONNECTION_FAILED', 503);
        } catch (\Exception $e) {
            throw new FeatherCloudException('Failed to download from Mythic Panel API: ' . $e->getMessage(), 'UNEXPECTED_ERROR', 500);
        }
    }

    /**
     * @param array<string, mixed> $queryParams
     * @param array<string, mixed>|null $jsonBody
     *
     * @throws FeatherCloudException
     *
     * @return array<string, mixed>
     */
    private function makeRequest(
        string $endpoint,
        string $method = 'GET',
        array $queryParams = [],
        ?array $jsonBody = null,
        bool $requireAuth = true,
        bool $requireMemberUuid = false,
    ): array {
        if ($requireAuth && !$this->isConfigured()) {
            throw new FeatherCloudException('Mythic Panel API credentials are not configured', 'CREDENTIALS_NOT_CONFIGURED', 503);
        }

        if ($requireMemberUuid && ($this->memberUserUuid === null || $this->memberUserUuid === '')) {
            throw new FeatherCloudException(
                MythicMemberResolver::UNMAPPED_MESSAGE,
                'MEMBER_UUID_REQUIRED',
                422
            );
        }

        try {
            $options = [
                'headers' => $this->requestHeaders($requireAuth, $requireMemberUuid),
            ];
            if ($queryParams !== []) {
                $options['query'] = $queryParams;
            }
            if ($jsonBody !== null) {
                $options['json'] = $jsonBody;
            }

            $path = ltrim($endpoint, '/');
            $this->log($method . ' /' . $path);

            $response = $this->client->request($method, $path, $options);
            $statusCode = $response->getStatusCode();
            $body = $response->getBody()->getContents();

            if ($statusCode === 429) {
                throw new FeatherCloudException('Mythic Panel API rate limit exceeded (~120/min)', 'RATE_LIMITED', 429);
            }

            if ($body === '') {
                throw new FeatherCloudException('Empty response from Mythic Panel API', 'EMPTY_RESPONSE', $statusCode);
            }

            $data = json_decode($body, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new FeatherCloudException(
                    'Invalid JSON response from Mythic Panel API: ' . json_last_error_msg(),
                    'INVALID_JSON',
                    $statusCode
                );
            }

            if (!is_array($data)) {
                throw new FeatherCloudException('Unexpected response shape from Mythic Panel API', 'INVALID_RESPONSE', $statusCode);
            }

            if (!isset($data['success']) || $data['success'] !== true) {
                $message = $data['message'] ?? ($data['error_message'] ?? 'Request failed');
                $errorCode = is_string($data['error_code'] ?? null)
                    ? $data['error_code']
                    : (is_string($data['error'] ?? null) ? $data['error'] : 'UNKNOWN_ERROR');
                $errorStatusCode = ($statusCode >= 200 && $statusCode < 300) ? 400 : $statusCode;

                if (in_array($statusCode, [401, 403], true)) {
                    $errorStatusCode = $statusCode;
                }

                $this->log('API request failed: ' . $message . ' (endpoint: ' . $endpoint . ', code: ' . $errorCode . ')', true);

                throw new FeatherCloudException($message, $errorCode, $errorStatusCode);
            }

            if (array_key_exists('data', $data)) {
                $payload = is_array($data['data']) ? $data['data'] : ['value' => $data['data']];
                if (isset($data['meta']) && is_array($data['meta'])) {
                    if (array_is_list($payload)) {
                        return ['data' => $payload, 'meta' => $data['meta']];
                    }
                    if (!isset($payload['meta']) || !is_array($payload['meta'])) {
                        $payload['meta'] = $data['meta'];
                    } else {
                        $payload['meta'] = array_merge($payload['meta'], $data['meta']);
                    }
                }

                return $payload;
            }

            $responseData = $data;
            unset($responseData['success'], $responseData['message'], $responseData['error'], $responseData['error_message'], $responseData['error_code']);

            return $responseData;
        } catch (FeatherCloudException $e) {
            throw $e;
        } catch (RequestException $e) {
            $statusCode = $e->hasResponse() ? $e->getResponse()->getStatusCode() : 500;
            $responseBody = $e->hasResponse() ? $e->getResponse()->getBody()->getContents() : '';
            $errorData = json_decode($responseBody, true);
            $message = is_array($errorData)
                ? ($errorData['message'] ?? ($errorData['error_message'] ?? $e->getMessage()))
                : $e->getMessage();
            $errorCode = is_array($errorData) && is_string($errorData['error_code'] ?? null)
                ? $errorData['error_code']
                : 'REQUEST_FAILED';

            $this->log('HTTP error: ' . $message . ' (endpoint: ' . $endpoint . ', status: ' . $statusCode . ')', true);

            throw new FeatherCloudException($message, $errorCode, $statusCode);
        } catch (GuzzleException $e) {
            $this->log('Connection failed: ' . $e->getMessage() . ' (endpoint: ' . $endpoint . ')', true);
            throw new FeatherCloudException('Failed to connect to Mythic Panel API: ' . $e->getMessage(), 'CONNECTION_FAILED', 503);
        } catch (\Exception $e) {
            $this->log('Unexpected error: ' . $e->getMessage() . ' (endpoint: ' . $endpoint . ')', true);
            throw new FeatherCloudException('Unexpected error: ' . $e->getMessage(), 'UNEXPECTED_ERROR', 500);
        }
    }

    /**
     * @return array<string, string>
     */
    private function defaultHeaders(): array
    {
        $headers = [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'User-Agent' => 'FeatherPanel-MythicPanelClient/1.0',
        ];

        if ($this->panelPublicKey !== '') {
            $headers['X-Panel-Public-Key'] = $this->panelPublicKey;
            $headers['X-Api-Key'] = $this->panelPublicKey;
        }
        if ($this->panelPrivateKey !== '') {
            $headers['X-Panel-Private-Key'] = $this->panelPrivateKey;
            $headers['X-Api-Secret'] = $this->panelPrivateKey;
        }

        return $headers;
    }

    /**
     * @return array<string, string>
     */
    private function requestHeaders(bool $includeAuth, bool $includeMemberUuid): array
    {
        $headers = [
            'Accept' => 'application/json',
            'User-Agent' => 'FeatherPanel-MythicPanelClient/1.0',
        ];

        if ($includeAuth) {
            $headers['X-Panel-Public-Key'] = $this->panelPublicKey;
            $headers['X-Panel-Private-Key'] = $this->panelPrivateKey;
            $headers['X-Api-Key'] = $this->panelPublicKey;
            $headers['X-Api-Secret'] = $this->panelPrivateKey;
        }

        if ($includeMemberUuid && $this->memberUserUuid !== null) {
            $headers['X-Panel-User-Uuid'] = $this->memberUserUuid;
        }

        return $headers;
    }

    private function log(string $message, bool $asError = false): void
    {
        if ($this->app === null) {
            return;
        }

        $prefix = '[MythicPanelAPI] ';
        if ($asError) {
            $this->app->getLogger()->error($prefix . $message);
        } else {
            $this->app->getLogger()->debug($prefix . $message);
        }
    }
}
