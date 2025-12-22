<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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

namespace App\Services\FeatherCloud;

use App\App;
use GuzzleHttp\Client;
use App\Config\ConfigInterface;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Exception\RequestException;

class FeatherCloudClient
{
    private Client $client;
    private string $baseUrl;
    private string $publicKey;
    private string $privateKey;
    private App $app;

    public function __construct(?string $baseUrl = null)
    {
        $this->app = App::getInstance(true);
        $config = $this->app->getConfig();

        // Get credentials from config
        $this->publicKey = $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, '');
        $this->privateKey = $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, '');

        // Set base URL (default to cloud.mythical.systems if not provided)
        $this->baseUrl = rtrim($baseUrl ?? 'https://api.featherpanel.com', '/');
        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => 30,
            'headers' => [
                'X-Panel-Public-Key' => $this->publicKey,
                'X-Panel-Private-Key' => $this->privateKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ],
        ]);
    }

    /**
     * Check if credentials are configured.
     */
    public function isConfigured(): bool
    {
        return !empty($this->publicKey) && !empty($this->privateKey);
    }

    /**
     * Get cloud information.
     */
    public function getCloud(): array
    {
        return $this->makeRequest('/cloud');
    }

    /**
     * Get team information.
     */
    public function getTeam(): array
    {
        return $this->makeRequest('/team');
    }

    /**
     * Get team members with pagination.
     *
     * @param int $page Page number
     * @param int $limit Results per page
     */
    public function getTeamMembers(int $page = 1, int $limit = 50): array
    {
        return $this->makeRequest('/team/members', 'GET', ['page' => $page, 'limit' => $limit]);
    }

    /**
     * Get total credits across all team members.
     */
    public function getTotalCredits(): array
    {
        return $this->makeRequest('/team/credits');
    }

    /**
     * Get purchased products for all team members.
     *
     * @param int $page Page number
     * @param int $limit Results per page
     */
    public function getPurchasedProducts(int $page = 1, int $limit = 50): array
    {
        return $this->makeRequest('/products', 'GET', ['page' => $page, 'limit' => $limit]);
    }

    /**
     * Get purchased products for a specific team member.
     *
     * @param string $userUuid User UUID
     * @param int $page Page number
     * @param int $limit Results per page
     */
    public function getMemberProducts(string $userUuid, int $page = 1, int $limit = 50): array
    {
        return $this->makeRequest("/members/{$userUuid}/products", 'GET', ['page' => $page, 'limit' => $limit]);
    }

    /**
     * Get member information.
     *
     * @param string $userUuid User UUID
     */
    public function getMember(string $userUuid): array
    {
        return $this->makeRequest("/members/{$userUuid}");
    }

    /**
     * Get comprehensive summary.
     */
    public function getSummary(): array
    {
        return $this->makeRequest('/summary');
    }

    /**
     * Download a premium package.
     *
     * @param string $packageName Package name/identifier
     * @param string $version Package version
     *
     * @throws FeatherCloudException
     *
     * @return string File content (binary)
     */
    public function downloadPremiumPackage(string $packageName, string $version): string
    {
        if (!$this->isConfigured()) {
            throw new FeatherCloudException('FeatherCloud credentials are not configured', 'CREDENTIALS_NOT_CONFIGURED', 503);
        }

        try {
            // Create a separate client for binary downloads (don't expect JSON)
            $downloadClient = new Client([
                'base_uri' => $this->baseUrl,
                'timeout' => 60, // Longer timeout for file downloads
                'headers' => [
                    'X-Panel-Public-Key' => $this->publicKey,
                    'X-Panel-Private-Key' => $this->privateKey,
                    'Accept' => '*/*', // Accept any content type for binary downloads
                ],
            ]);

            $this->app->getLogger()->error('[FeatherCloud] Downloading premium package: ' . $packageName . ' v' . $version);

            // Download premium package via FeatherCloud panel API
            // This endpoint proxies to api.featherpanel.com with proper authentication
            $response = $downloadClient->request('GET', '/panel/packages/' . urlencode($packageName) . '/premium/download/' . urlencode($version));

            $statusCode = $response->getStatusCode();
            $contentType = $response->getHeaderLine('Content-Type');
            $body = $response->getBody()->getContents();

            $this->app->getLogger()->error('[FeatherCloud] Download response - Status: ' . $statusCode . ', Content-Type: ' . $contentType . ', Body Size: ' . strlen($body));

            // Check if response indicates an error (JSON error response)
            if ($statusCode >= 400 || (strpos($contentType, 'application/json') !== false && !empty($body))) {
                $errorData = json_decode($body, true);
                if (is_array($errorData) && isset($errorData['success']) && !$errorData['success']) {
                    $message = $errorData['message'] ?? ($errorData['error_message'] ?? 'Download failed');
                    $errorCode = $errorData['error'] ?? ($errorData['error_code'] ?? 'DOWNLOAD_FAILED');
                    throw new FeatherCloudException($message, $errorCode, $statusCode);
                }
            }

            // Return binary content
            return $body;
        } catch (FeatherCloudException $e) {
            throw $e;
        } catch (RequestException $e) {
            $statusCode = $e->hasResponse() ? $e->getResponse()->getStatusCode() : 500;
            $responseBody = '';
            $errorData = [];

            if ($e->hasResponse()) {
                $responseBody = $e->getResponse()->getBody()->getContents();
                $errorData = json_decode($responseBody, true);
            }

            $message = $errorData['message'] ?? ($errorData['error_message'] ?? $e->getMessage());
            $errorCode = $errorData['error'] ?? ($errorData['error_code'] ?? 'DOWNLOAD_FAILED');

            $this->app->getLogger()->error('[FeatherCloud] Premium package download failed: ' . $message . ' (Package: ' . $packageName . ', Version: ' . $version . ', Status: ' . $statusCode . ')');

            throw new FeatherCloudException($message, $errorCode, $statusCode);
        } catch (GuzzleException $e) {
            $this->app->getLogger()->error('[FeatherCloud] Premium package download connection failed: ' . $e->getMessage() . ' (Package: ' . $packageName . ', Version: ' . $version . ')');
            throw new FeatherCloudException('Failed to download premium package: ' . $e->getMessage(), 'CONNECTION_FAILED', 503);
        } catch (\Exception $e) {
            $this->app->getLogger()->error('[FeatherCloud] Premium package download unexpected error: ' . $e->getMessage() . ' (Package: ' . $packageName . ', Version: ' . $version . ')');
            throw new FeatherCloudException('Failed to download premium package: ' . $e->getMessage(), 'UNEXPECTED_ERROR', 500);
        }
    }

    /**
     * Make a request to the FeatherCloud Panel API.
     *
     * @param string $endpoint API endpoint (e.g., '/panel/summary')
     * @param string $method HTTP method (default: 'GET')
     * @param array $queryParams Query parameters
     *
     * @throws FeatherCloudException
     *
     * @return array Response data
     */
    private function makeRequest(string $endpoint, string $method = 'GET', array $queryParams = []): array
    {
        if (!$this->isConfigured()) {
            throw new FeatherCloudException('FeatherCloud credentials are not configured', 'CREDENTIALS_NOT_CONFIGURED', 503);
        }

        try {
            $options = [];
            if (!empty($queryParams)) {
                $options['query'] = $queryParams;
            }

            // Log request (use error level to ensure it's always logged)
            $this->app->getLogger()->error('[FeatherCloud Request] ' . $method . ' /panel' . $endpoint . ' | Public Key: ' . substr($this->publicKey, 0, 20) . '...');

            $response = $this->client->request($method, '/panel' . $endpoint, $options);
            $statusCode = $response->getStatusCode();
            $contentType = $response->getHeaderLine('Content-Type');
            $body = $response->getBody()->getContents();

            // Log full response details (use error level to ensure it's always logged)
            $this->app->getLogger()->error('[FeatherCloud Response] Endpoint: ' . $endpoint . ' | Status: ' . $statusCode . ' | Content-Type: ' . ($contentType ?: 'NOT SET') . ' | Body Length: ' . strlen($body) . ' | Body: ' . substr($body, 0, 3000));

            // Check if body is empty
            if (empty($body)) {
                $this->app->getLogger()->error('[FeatherCloud] Empty response (Endpoint: ' . $endpoint . ')');
                throw new FeatherCloudException('Empty response from FeatherCloud', 'EMPTY_RESPONSE', $statusCode);
            }

            // Try to decode JSON regardless of content-type (some APIs return JSON with wrong/missing content-type)
            $data = json_decode($body, true);
            $jsonError = json_last_error();

            // If JSON decode fails, log the error and throw exception
            if ($jsonError !== JSON_ERROR_NONE) {
                $jsonErrorMsg = json_last_error_msg();
                $this->app->getLogger()->error('[FeatherCloud JSON Error] Endpoint: ' . $endpoint . ' | Content-Type: ' . ($contentType ?: 'NOT SET') . ' | JSON Error: ' . $jsonErrorMsg . ' | Body Preview: ' . substr($body, 0, 3000));
                throw new FeatherCloudException('Invalid JSON response from FeatherCloud: ' . $jsonErrorMsg . ' (Content-Type: ' . ($contentType ?: 'not set') . ')', 'INVALID_JSON', $statusCode);
            }

            // Check if response indicates failure
            if (!isset($data['success']) || $data['success'] !== true) {
                $message = $data['message'] ?? ($data['error_message'] ?? 'Request failed');
                $errorCode = $data['error'] ?? ($data['error_code'] ?? 'UNKNOWN_ERROR');

                // Log full response for debugging
                $this->app->getLogger()->error('FeatherCloud API request failed: ' . $message . ' (Endpoint: ' . $endpoint . ', Code: ' . $errorCode . ', Full response: ' . json_encode($data));

                // If status code is not 200-299, use that; otherwise use 400 for failed requests
                $errorStatusCode = ($statusCode >= 200 && $statusCode < 300) ? 400 : $statusCode;
                throw new FeatherCloudException($message, $errorCode, $errorStatusCode);
            }

            // Return data, or empty array if data key doesn't exist
            // Some endpoints might return data directly without a 'data' wrapper
            if (isset($data['data'])) {
                return $data['data'];
            }

            // If no 'data' key but success is true, return the whole response minus success/message
            $responseData = $data;
            unset($responseData['success'], $responseData['message']);

            return $responseData;
        } catch (FeatherCloudException $e) {
            // Re-throw FeatherCloud exceptions
            throw $e;
        } catch (RequestException $e) {
            $statusCode = $e->hasResponse() ? $e->getResponse()->getStatusCode() : 500;
            $responseBody = '';
            $errorData = [];

            if ($e->hasResponse()) {
                $responseBody = $e->getResponse()->getBody()->getContents();
                $errorData = json_decode($responseBody, true);
            }

            $message = $errorData['message'] ?? ($errorData['error_message'] ?? $e->getMessage());
            $errorCode = $errorData['error'] ?? ($errorData['error_code'] ?? 'REQUEST_FAILED');

            $this->app->getLogger()->error('FeatherCloud API HTTP error: ' . $message . ' (Endpoint: ' . $endpoint . ', Status: ' . $statusCode . ')');

            throw new FeatherCloudException($message, $errorCode, $statusCode);
        } catch (GuzzleException $e) {
            $this->app->getLogger()->error('FeatherCloud API connection failed: ' . $e->getMessage() . ' (Endpoint: ' . $endpoint . ')');
            throw new FeatherCloudException('Failed to connect to FeatherCloud: ' . $e->getMessage(), 'CONNECTION_FAILED', 503);
        } catch (\Exception $e) {
            $this->app->getLogger()->error('FeatherCloud API unexpected error: ' . $e->getMessage() . ' (Endpoint: ' . $endpoint . ', Class: ' . get_class($e) . ')');
            throw new FeatherCloudException('Unexpected error: ' . $e->getMessage(), 'UNEXPECTED_ERROR', 500);
        }
    }
}
