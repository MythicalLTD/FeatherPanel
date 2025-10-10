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

namespace App\Services\Wings;

use GuzzleHttp\Client;
use GuzzleHttp\Psr7\Request;
use App\Services\Wings\Utils\DnsResolver;
use App\Services\Wings\Utils\TokenGenerator;
use App\Services\Wings\Exceptions\WingsRequestException;
use App\Services\Wings\Exceptions\WingsConnectionException;
use App\Services\Wings\Exceptions\WingsAuthenticationException;

/**
 * Wings API Client for Pterodactyl Wings.
 *
 * This class provides a wrapper for the Pterodactyl Wings API,
 * handling authentication, requests, and response processing.
 */
class WingsConnection
{
    private string $baseUrl;
    private string $authToken;
    private string $protocol;
    private int $port;
    private int $timeout;
    private array $defaultHeaders;
    private TokenGenerator $tokenGenerator;
    private Client $client;

    /**
     * Create a new Wings connection instance.
     *
     * @param string $host The Wings server hostname/IP
     * @param int $port The Wings server port (default: 8080)
     * @param string $protocol The protocol to use (http/https)
     * @param string $authToken The authentication token for Wings
     * @param int $timeout Request timeout in seconds (default: 30)
     */
    public function __construct(
        string $host,
        int $port = 8080,
        string $protocol = 'http',
        string $authToken = '',
        int $timeout = 30,
    ) {
        $this->protocol = $protocol;
        $this->port = $port;
        $this->authToken = $authToken;
        $this->timeout = $timeout;

        // Build base URL
        $this->baseUrl = $this->buildBaseUrl($host, $port, $protocol);

        // Initialize token generator
        $this->tokenGenerator = new TokenGenerator();

        // Initialize Guzzle client with enhanced DNS and connection settings
        $this->client = new Client([
            'timeout' => $this->timeout,
            'verify' => false, // In production, this should be true
            'http_errors' => false, // Handle HTTP errors manually
            'curl' => [
                CURLOPT_DNS_CACHE_TIMEOUT => 300, // DNS cache for 5 minutes
                CURLOPT_CONNECTTIMEOUT => 10, // Connection timeout
                CURLOPT_TIMEOUT => $this->timeout, // Total timeout
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_MAXREDIRS => 3,
                CURLOPT_TCP_NODELAY => true, // Disable Nagle's algorithm
                CURLOPT_TCP_KEEPALIVE => 1,
                CURLOPT_TCP_KEEPIDLE => 60,
                CURLOPT_TCP_KEEPINTVL => 30,
                // DNS resolution settings
                CURLOPT_DNS_USE_GLOBAL_CACHE => true,
                CURLOPT_IPRESOLVE => CURL_IPRESOLVE_WHATEVER, // Try both IPv4 and IPv6
            ],
        ]);

        // Set default headers
        $this->defaultHeaders = [
            'Accept' => 'application/json',
            'User-Agent' => 'FeatherPanel/v1.0.0',
            'Content-Type' => 'application/json',
            'Connection' => 'keep-alive',
        ];

        if (!empty($this->authToken)) {
            $this->defaultHeaders['Authorization'] = "Bearer {$this->authToken}";
        }
    }

    /**
     * Get the base URL.
     */
    public function getBaseUrl(): string
    {
        return $this->baseUrl;
    }

    /**
     * Get the authentication token.
     */
    public function getAuthToken(): string
    {
        return $this->authToken;
    }

    /**
     * Set the authentication token.
     */
    public function setAuthToken(string $token): void
    {
        $this->authToken = $token;

        // Update default headers
        unset($this->defaultHeaders['Authorization']);

        if (!empty($this->authToken)) {
            $this->defaultHeaders['Authorization'] = "Bearer {$this->authToken}";
        }
    }

    /**
     * Get the token generator instance.
     */
    public function getTokenGenerator(): TokenGenerator
    {
        return $this->tokenGenerator;
    }

    /**
     * Make a GET request to the Wings API.
     *
     * @param string $endpoint The API endpoint (without base URL)
     * @param array $headers Additional headers to include
     * @param int $maxRetries Maximum number of retry attempts
     *
     * @throws WingsConnectionException
     * @throws WingsAuthenticationException
     * @throws WingsRequestException
     *
     * @return array The response data
     */
    public function get(string $endpoint, array $headers = [], int $maxRetries = 3): array
    {
        return $this->request('GET', $endpoint, [], $headers, $maxRetries);
    }

    /**
     * Make a GET request to the Wings API and return raw response.
     * Useful for file downloads and other non-JSON responses.
     *
     * @param string $endpoint The API endpoint (without base URL)
     * @param array $headers Additional headers to include
     * @param int $maxRetries Maximum number of retry attempts
     *
     * @throws WingsConnectionException
     * @throws WingsAuthenticationException
     * @throws WingsRequestException
     *
     * @return string The raw response body
     */
    public function getRaw(string $endpoint, array $headers = [], int $maxRetries = 3): string
    {
        $url = $this->baseUrl . $endpoint;
        $lastException = null;

        for ($attempt = 0; $attempt <= $maxRetries; ++$attempt) {
            try {
                // Merge headers
                $requestHeaders = array_merge($this->defaultHeaders, $headers);

                // Create request
                $request = new Request('GET', $url, $requestHeaders);

                // Send request asynchronously and wait for response
                $response = $this->client->sendAsync($request)->wait();
                $httpCode = $response->getStatusCode();
                $responseBody = $response->getBody()->getContents();

                // Handle HTTP errors
                if ($httpCode >= 400) {
                    // Try to decode as JSON for error messages
                    $responseData = json_decode($responseBody, true);
                    $this->handleHttpError($httpCode, $responseData, $endpoint);
                }

                return $responseBody;
            } catch (\GuzzleHttp\Exception\ConnectException $e) {
                $lastException = $e;

                if ($attempt < $maxRetries && $this->isDnsResolutionError($e)) {
                    $delay = $this->calculateRetryDelay($attempt);
                    error_log("DNS resolution failed for {$url}, retrying in {$delay}s (attempt " . ($attempt + 1) . "/{$maxRetries})");
                    usleep($delay * 1000000);
                    continue;
                }

                throw new WingsConnectionException('Connection failed: ' . $e->getMessage());
            } catch (\GuzzleHttp\Exception\RequestException $e) {
                $lastException = $e;

                if ($attempt < $maxRetries && $this->isTimeoutError($e)) {
                    $delay = $this->calculateRetryDelay($attempt);
                    error_log("Request timeout for {$url}, retrying in {$delay}s (attempt " . ($attempt + 1) . "/{$maxRetries})");
                    usleep($delay * 1000000);
                    continue;
                }

                throw new WingsConnectionException('Request failed: ' . $e->getMessage());
            } catch (\Exception $e) {
                $lastException = $e;

                if ($attempt < $maxRetries) {
                    $delay = $this->calculateRetryDelay($attempt);
                    error_log("Unexpected error for {$url}, retrying in {$delay}s (attempt " . ($attempt + 1) . "/{$maxRetries}): " . $e->getMessage());
                    usleep($delay * 1000000);
                    continue;
                }

                throw new WingsConnectionException('Unexpected error: ' . $e->getMessage());
            }
        }

        throw new WingsConnectionException('All retry attempts failed. Last error: ' . ($lastException ? $lastException->getMessage() : 'Unknown error'));
    }

    /**
     * Make a POST request to the Wings API.
     *
     * @param string $endpoint The API endpoint (without base URL)
     * @param array $data The data to send
     * @param array $headers Additional headers to include
     * @param int $maxRetries Maximum number of retry attempts
     *
     * @throws WingsConnectionException
     * @throws WingsAuthenticationException
     * @throws WingsRequestException
     *
     * @return array The response data
     */
    public function post(string $endpoint, array $data = [], array $headers = [], int $maxRetries = 3): array
    {
        return $this->request('POST', $endpoint, $data, $headers, $maxRetries);
    }

    /**
     * Make a POST request with a raw body (no JSON encoding).
     * Useful for uploading file contents to Wings.
     *
     * @param string $endpoint The API endpoint (without base URL)
     * @param string $body Raw request body
     * @param array $headers Additional headers to include
     * @param int $maxRetries Maximum number of retry attempts
     *
     * @throws WingsConnectionException
     * @throws WingsAuthenticationException
     * @throws WingsRequestException
     *
     * @return array Decoded JSON response if any, otherwise empty array
     */
    public function postRaw(string $endpoint, string $body, array $headers = [], int $maxRetries = 3): array
    {
        $url = $this->baseUrl . $endpoint;
        $lastException = null;

        for ($attempt = 0; $attempt <= $maxRetries; ++$attempt) {
            try {
                // Merge headers but override Content-Type to allow raw bodies
                $requestHeaders = array_merge($this->defaultHeaders, $headers);
                // If caller didn't specify, default to text/plain
                if (!isset($requestHeaders['Content-Type'])) {
                    $requestHeaders['Content-Type'] = 'text/plain';
                }

                $request = new Request('POST', $url, $requestHeaders, $body);

                $response = $this->client->sendAsync($request)->wait();
                $httpCode = $response->getStatusCode();
                $responseBody = $response->getBody()->getContents();

                if ($httpCode >= 400) {
                    $responseData = json_decode($responseBody, true);
                    $this->handleHttpError($httpCode, $responseData, $endpoint);
                }

                // Try to decode JSON if present, otherwise return empty
                $decoded = json_decode($responseBody, true);

                return is_array($decoded) ? $decoded : [];
            } catch (\GuzzleHttp\Exception\ConnectException $e) {
                $lastException = $e;

                if ($attempt < $maxRetries && $this->isDnsResolutionError($e)) {
                    $delay = $this->calculateRetryDelay($attempt);
                    error_log("DNS resolution failed for {$url}, retrying in {$delay}s (attempt " . ($attempt + 1) . "/{$maxRetries})");
                    usleep($delay * 1000000);
                    continue;
                }

                throw new WingsConnectionException('Connection failed: ' . $e->getMessage());
            } catch (\GuzzleHttp\Exception\RequestException $e) {
                $lastException = $e;

                if ($attempt < $maxRetries && $this->isTimeoutError($e)) {
                    $delay = $this->calculateRetryDelay($attempt);
                    error_log("Request timeout for {$url}, retrying in {$delay}s (attempt " . ($attempt + 1) . "/{$maxRetries})");
                    usleep($delay * 1000000);
                    continue;
                }

                throw new WingsConnectionException('Request failed: ' . $e->getMessage());
            } catch (\Exception $e) {
                $lastException = $e;

                if ($attempt < $maxRetries) {
                    $delay = $this->calculateRetryDelay($attempt);
                    error_log("Unexpected error for {$url}, retrying in {$delay}s (attempt " . ($attempt + 1) . "/{$maxRetries}): " . $e->getMessage());
                    usleep($delay * 1000000);
                    continue;
                }

                throw new WingsConnectionException('Unexpected error: ' . $e->getMessage());
            }
        }

        throw new WingsConnectionException('All retry attempts failed. Last error: ' . ($lastException ? $lastException->getMessage() : 'Unknown error'));
    }

    /**
     * Make a PUT request to the Wings API.
     *
     * @param string $endpoint The API endpoint (without base URL)
     * @param array $data The data to send
     * @param array $headers Additional headers to include
     * @param int $maxRetries Maximum number of retry attempts
     *
     * @throws WingsConnectionException
     * @throws WingsAuthenticationException
     * @throws WingsRequestException
     *
     * @return array The response data
     */
    public function put(string $endpoint, array $data = [], array $headers = [], int $maxRetries = 3): array
    {
        return $this->request('PUT', $endpoint, $data, $headers, $maxRetries);
    }

    /**
     * Make a DELETE request to the Wings API.
     *
     * @param string $endpoint The API endpoint (without base URL)
     * @param array $headers Additional headers to include
     * @param int $maxRetries Maximum number of retry attempts
     *
     * @throws WingsConnectionException
     * @throws WingsAuthenticationException
     * @throws WingsRequestException
     *
     * @return array The response data
     */
    public function delete(string $endpoint, array $headers = [], int $maxRetries = 3): array
    {
        return $this->request('DELETE', $endpoint, [], $headers, $maxRetries);
    }

    /**
     * Make a PATCH request to the Wings API.
     *
     * @param string $endpoint The API endpoint (without base URL)
     * @param array $data The data to send
     * @param array $headers Additional headers to include
     * @param int $maxRetries Maximum number of retry attempts
     *
     * @throws WingsConnectionException
     * @throws WingsAuthenticationException
     * @throws WingsRequestException
     *
     * @return array The response data
     */
    public function patch(string $endpoint, array $data = [], array $headers = [], int $maxRetries = 3): array
    {
        return $this->request('PATCH', $endpoint, $data, $headers, $maxRetries);
    }

    /**
     * Make a raw HTTP request to the Wings API with retry mechanism.
     *
     * @param string $method The HTTP method
     * @param string $endpoint The API endpoint (without base URL)
     * @param array $data The data to send (for POST, PUT, PATCH)
     * @param array $headers Additional headers to include
     * @param int $maxRetries Maximum number of retry attempts (default: 3)
     *
     * @throws WingsConnectionException
     * @throws WingsAuthenticationException
     * @throws WingsRequestException
     *
     * @return array The response data
     */
    public function request(string $method, string $endpoint, array $data = [], array $headers = [], int $maxRetries = 3): array
    {
        $url = $this->baseUrl . $endpoint;
        $lastException = null;

        for ($attempt = 0; $attempt <= $maxRetries; ++$attempt) {
            try {
                // Merge headers
                $requestHeaders = array_merge($this->defaultHeaders, $headers);

                // Prepare request body
                $body = '{}';
                if (!empty($data)) {
                    $body = json_encode($data);
                }

                // Create request
                $request = new Request($method, $url, $requestHeaders, $body);

                // Send request asynchronously and wait for response
                $response = $this->client->sendAsync($request)->wait();
                $httpCode = $response->getStatusCode();
                $responseBody = $response->getBody()->getContents();
                $responseData = json_decode($responseBody, true);

                // Handle HTTP errors
                if ($httpCode >= 400) {
                    $this->handleHttpError($httpCode, $responseData, $endpoint);
                }

                return $responseData ?? [];
            } catch (\GuzzleHttp\Exception\ConnectException $e) {
                $lastException = $e;

                // Check if it's a DNS resolution error and we have retries left
                if ($attempt < $maxRetries && $this->isDnsResolutionError($e)) {
                    $delay = $this->calculateRetryDelay($attempt);
                    error_log("DNS resolution failed for {$url}, retrying in {$delay}s (attempt " . ($attempt + 1) . "/{$maxRetries})");
                    usleep($delay * 1000000); // Convert to microseconds
                    continue;
                }

                throw new WingsConnectionException('Connection failed: ' . $e->getMessage());
            } catch (\GuzzleHttp\Exception\RequestException $e) {
                $lastException = $e;

                // Check if it's a timeout error and we have retries left
                if ($attempt < $maxRetries && $this->isTimeoutError($e)) {
                    $delay = $this->calculateRetryDelay($attempt);
                    error_log("Request timeout for {$url}, retrying in {$delay}s (attempt " . ($attempt + 1) . "/{$maxRetries})");
                    usleep($delay * 1000000);
                    continue;
                }

                throw new WingsConnectionException('Request failed: ' . $e->getMessage());
            } catch (\Exception $e) {
                $lastException = $e;

                if ($attempt < $maxRetries) {
                    $delay = $this->calculateRetryDelay($attempt);
                    error_log("Unexpected error for {$url}, retrying in {$delay}s (attempt " . ($attempt + 1) . "/{$maxRetries}): " . $e->getMessage());
                    usleep($delay * 1000000);
                    continue;
                }

                throw new WingsConnectionException('Unexpected error: ' . $e->getMessage());
            }
        }

        // If we get here, all retries failed
        throw new WingsConnectionException('All retry attempts failed. Last error: ' . ($lastException ? $lastException->getMessage() : 'Unknown error'));
    }

    /**
     * Test the connection to Wings.
     */
    public function testConnection(): bool
    {
        try {
            $this->get('/api/system');

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Test DNS resolution for the Wings host.
     */
    public function testDnsResolution(): array
    {
        $host = parse_url($this->baseUrl, PHP_URL_HOST);

        // Use the DnsResolver utility for comprehensive testing
        $dnsResults = DnsResolver::testResolution($host);

        // Test if host is reachable
        $reachable = false;
        $reachableError = null;

        try {
            $context = stream_context_create([
                'http' => [
                    'timeout' => 5,
                    'ignore_errors' => true,
                ],
            ]);

            $result = file_get_contents($this->baseUrl . '/api/system', false, $context);
            $reachable = $result !== false;
        } catch (\Exception $e) {
            $reachableError = $e->getMessage();
        }

        return array_merge($dnsResults, [
            'reachable' => $reachable,
            'reachable_error' => $reachableError,
        ]);
    }

    /**
     * Get detailed connection diagnostics.
     */
    public function getConnectionDiagnostics(): array
    {
        $host = parse_url($this->baseUrl, PHP_URL_HOST);

        return [
            'base_url' => $this->baseUrl,
            'host' => $host,
            'protocol' => $this->protocol,
            'port' => $this->port,
            'timeout' => $this->timeout,
            'dns_resolution' => $this->testDnsResolution(),
            'connection_test' => $this->testConnection(),
            'timestamp' => date('Y-m-d H:i:s'),
        ];
    }

    /**
     * Get system information from Wings.
     *
     * @param bool $detailed Whether to get detailed information (v2)
     */
    public function getSystemInfo(bool $detailed = false): array
    {
        $endpoint = '/api/system';
        if ($detailed) {
            $endpoint .= '?v=2';
        }

        return $this->get($endpoint);
    }

    /**
     * Get system IP addresses.
     */
    public function getSystemIPs(): array
    {
        return $this->get('/api/system/ips');
    }

    /**
     * Build the base URL for the Wings API.
     */
    private function buildBaseUrl(string $host, int $port, string $protocol): string
    {
        $host = rtrim($host, '/');

        return "{$protocol}://{$host}:{$port}";
    }

    /**
     * Handle HTTP error responses.
     *
     * @throws WingsAuthenticationException
     * @throws WingsRequestException
     */
    private function handleHttpError(int $httpCode, ?array $responseData, string $endpoint): void
    {
        $errorMessage = $responseData['error'] ?? 'Unknown error';

        switch ($httpCode) {
            case 401:
                throw new WingsAuthenticationException("Authentication failed: {$errorMessage}");
            case 403:
                throw new WingsAuthenticationException("Access forbidden: {$errorMessage}");
            case 404:
                throw new WingsRequestException("Endpoint not found: {$endpoint}");
            case 429:
                throw new WingsRequestException("Rate limit exceeded: {$errorMessage}");
            case 500:
                throw new WingsRequestException("Server error: {$errorMessage}");
            default:
                throw new WingsRequestException("HTTP {$httpCode}: {$errorMessage}");
        }
    }

    /**
     * Check if the exception is a DNS resolution error.
     */
    private function isDnsResolutionError(\Exception $e): bool
    {
        $message = $e->getMessage();

        // Check for common DNS resolution error messages
        return strpos($message, 'Could not resolve host') !== false
            || strpos($message, 'Name or service not known') !== false
            || strpos($message, 'Temporary failure in name resolution') !== false
            || strpos($message, 'cURL error 6') !== false
            || strpos($message, 'cURL error 7') !== false;
    }

    /**
     * Check if the exception is a timeout error.
     */
    private function isTimeoutError(\Exception $e): bool
    {
        $message = $e->getMessage();

        // Check for timeout error messages
        return strpos($message, 'timeout') !== false
            || strpos($message, 'timed out') !== false
            || strpos($message, 'cURL error 28') !== false;
    }

    /**
     * Calculate retry delay with exponential backoff and jitter.
     */
    private function calculateRetryDelay(int $attempt): int
    {
        // Exponential backoff: 1s, 2s, 4s, 8s, etc.
        $baseDelay = pow(2, $attempt);

        // Add jitter to prevent thundering herd (random between 0.5 and 1.5)
        $jitter = 0.5 + (mt_rand() / mt_getrandmax());

        return (int) ($baseDelay * $jitter);
    }
}
