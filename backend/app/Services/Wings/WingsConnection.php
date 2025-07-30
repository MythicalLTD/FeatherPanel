<?php

/*
 * This file is part of App.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Services\Wings;

use GuzzleHttp\Client;
use GuzzleHttp\Psr7\Request;
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

        // Initialize Guzzle client
        $this->client = new Client([
            'timeout' => $this->timeout,
            'verify' => false, // In production, this should be true
        ]);

        // Set default headers
        $this->defaultHeaders = [
            'Accept' => 'application/json',
            'User-Agent' => 'MythicalPanel/v1.0.0',
            'Content-Type' => 'application/json',
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
     *
     * @throws WingsConnectionException
     * @throws WingsAuthenticationException
     * @throws WingsRequestException
     *
     * @return array The response data
     */
    public function get(string $endpoint, array $headers = []): array
    {
        return $this->request('GET', $endpoint, [], $headers);
    }

    /**
     * Make a POST request to the Wings API.
     *
     * @param string $endpoint The API endpoint (without base URL)
     * @param array $data The data to send
     * @param array $headers Additional headers to include
     *
     * @throws WingsConnectionException
     * @throws WingsAuthenticationException
     * @throws WingsRequestException
     *
     * @return array The response data
     */
    public function post(string $endpoint, array $data = [], array $headers = []): array
    {
        return $this->request('POST', $endpoint, $data, $headers);
    }

    /**
     * Make a PUT request to the Wings API.
     *
     * @param string $endpoint The API endpoint (without base URL)
     * @param array $data The data to send
     * @param array $headers Additional headers to include
     *
     * @throws WingsConnectionException
     * @throws WingsAuthenticationException
     * @throws WingsRequestException
     *
     * @return array The response data
     */
    public function put(string $endpoint, array $data = [], array $headers = []): array
    {
        return $this->request('PUT', $endpoint, $data, $headers);
    }

    /**
     * Make a DELETE request to the Wings API.
     *
     * @param string $endpoint The API endpoint (without base URL)
     * @param array $headers Additional headers to include
     *
     * @throws WingsConnectionException
     * @throws WingsAuthenticationException
     * @throws WingsRequestException
     *
     * @return array The response data
     */
    public function delete(string $endpoint, array $headers = []): array
    {
        return $this->request('DELETE', $endpoint, [], $headers);
    }

    /**
     * Make a PATCH request to the Wings API.
     *
     * @param string $endpoint The API endpoint (without base URL)
     * @param array $data The data to send
     * @param array $headers Additional headers to include
     *
     * @throws WingsConnectionException
     * @throws WingsAuthenticationException
     * @throws WingsRequestException
     *
     * @return array The response data
     */
    public function patch(string $endpoint, array $data = [], array $headers = []): array
    {
        return $this->request('PATCH', $endpoint, $data, $headers);
    }

    /**
     * Make a raw HTTP request to the Wings API.
     *
     * @param string $method The HTTP method
     * @param string $endpoint The API endpoint (without base URL)
     * @param array $data The data to send (for POST, PUT, PATCH)
     * @param array $headers Additional headers to include
     *
     * @throws WingsConnectionException
     * @throws WingsAuthenticationException
     * @throws WingsRequestException
     *
     * @return array The response data
     */
    public function request(string $method, string $endpoint, array $data = [], array $headers = []): array
    {
        $url = $this->baseUrl . $endpoint;

        // Merge headers
        $requestHeaders = array_merge($this->defaultHeaders, $headers);

        // Prepare request body
        $body = '{}';
        if (!empty($data)) {
            $body = json_encode($data);
        }

        // Create request
        $request = new Request($method, $url, $requestHeaders, $body);

        try {
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
            throw new WingsConnectionException('Connection failed: ' . $e->getMessage());
        } catch (\GuzzleHttp\Exception\RequestException $e) {
            throw new WingsConnectionException('Request failed: ' . $e->getMessage());
        } catch (\Exception $e) {
            throw new WingsConnectionException('Unexpected error: ' . $e->getMessage());
        }
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
}
