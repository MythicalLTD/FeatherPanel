<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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

namespace App\Helpers;

use Symfony\Component\HttpFoundation\Response;

class ApiResponse
{
    public const PRETTYPRINT = true;

    public static function success(?array $data = null, string $message = 'OK', int $status = 200): Response
    {
        return new Response(json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'error' => false,
            'error_message' => null,
            'error_code' => null,
        ], self::PRETTYPRINT ? JSON_PRETTY_PRINT : 0), $status, [
            'Content-Type' => 'application/json',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Credentials' => 'true',
        ]);
    }

    public static function error(string $error_message = 'Error', ?string $error_code = null, int $status = 400, ?array $data = null): Response
    {
        return new Response(json_encode([
            'success' => false,
            'message' => $error_message,
            'data' => $data,
            'error' => true,
            'error_message' => $error_message,
            'error_code' => $error_code,
            'errors' => [
                [
                    'code' => $error_code,
                    'detail' => $error_message,
                    'status' => $status,
                ],
            ],
        ], self::PRETTYPRINT ? JSON_PRETTY_PRINT : 0), $status, [
            'Content-Type' => 'application/json',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Credentials' => 'true',
        ]);
    }

    public static function exception(string $message = 'Error', ?string $error = null, array $trace = []): Response
    {
        if ($error instanceof \Exception) {
            $error = $error->getMessage();
        }

        return new Response(json_encode([
            'success' => false,
            'message' => $message,
            'data' => [],
            'error' => $error,
            'error_message' => $error,
            'error_code' => null,
            'errors' => [
                [
                    'code' => 'INTERNAL_SERVER_ERROR',
                    'detail' => $error,
                    'status' => 500,
                ],
            ],
            'trace' => $trace,
        ], self::PRETTYPRINT ? JSON_PRETTY_PRINT : 0), 500, [
            'Content-Type' => 'application/json',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Credentials' => 'true',
        ]);
    }

    public static function sendManualResponse(array $data, int $status = 200): Response
    {
        return new Response(json_encode($data, self::PRETTYPRINT ? JSON_PRETTY_PRINT : 0), $status, [
            'Content-Type' => 'application/json',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Credentials' => 'true',
        ]);
    }
}
