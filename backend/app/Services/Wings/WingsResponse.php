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

namespace App\Services\Wings;

/**
 * Wings API Response Wrapper.
 *
 * This class wraps Wings API responses to provide a consistent interface
 * for checking success status, getting data, and handling errors.
 */
class WingsResponse
{
    private array | string $data;
    private int $statusCode;
    private bool $success;

    /**
     * Create a new WingsResponse instance.
     */
    public function __construct(array | string $data, int $statusCode = 200)
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
    public function getData(): array | string
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
