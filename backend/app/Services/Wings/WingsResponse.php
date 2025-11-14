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
