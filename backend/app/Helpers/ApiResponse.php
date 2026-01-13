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
