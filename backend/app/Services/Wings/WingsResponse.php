<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Services\Wings;

/**
 * Wings API Response Wrapper.
 *
 * This class wraps Wings API responses to provide a consistent interface
 * for checking success status, getting data, and handling errors.
 */
class WingsResponse
{
    private array|string $data;
    private int $statusCode;
    private bool $success;

    /**
     * Create a new WingsResponse instance.
     */
    public function __construct(array|string $data, int $statusCode = 200)
    {
        $this->data = $data;
        $this->statusCode = $statusCode;
        $this->success = $statusCode >= 200 && $statusCode < 300;
    }

    /**
     * Check if the response was successful.
     */
    public function isSuccessful(): bool
    {
        return $this->success;
    }

    /**
     * Get the response data.
     */
    public function getData(): array|string
    {
        return $this->data;
    }

    /**
     * Get the raw response body as a string.
     * Useful for file downloads or when you need the unprocessed response.
     */
    public function getRawBody(): string
    {
        if (is_array($this->data)) {
            return json_encode($this->data);
        }

        return $this->data;
    }

    /**
     * Get the HTTP status code.
     */
    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    /**
     * Get the error message from the response.
     */
    public function getError(): string
    {
        if (is_array($this->data)) {
            if (isset($this->data['error'])) {
                return $this->data['error'];
            }

            if (isset($this->data['message'])) {
                return $this->data['message'];
            }
        }

        return 'Unknown error';
    }

    /**
     * Get a specific value from the response data.
     */
    public function get(string $key, $default = null)
    {
        if (is_array($this->data)) {
            return $this->data[$key] ?? $default;
        }

        return $default;
    }

    /**
     * Check if the response has a specific key.
     */
    public function has(string $key): bool
    {
        if (is_array($this->data)) {
            return isset($this->data[$key]);
        }

        return false;
    }

    /**
     * Get the raw response data.
     */
    public function toArray(): array
    {
        if (is_array($this->data)) {
            return $this->data;
        }

        return ['content' => $this->data];
    }
}
