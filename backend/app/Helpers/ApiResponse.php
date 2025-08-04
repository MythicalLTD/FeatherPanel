<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Helpers;

use Symfony\Component\HttpFoundation\Response;

class ApiResponse
{
    public static function success(?array $data = null, string $message = 'OK', int $status = 200): Response
    {
        return new Response(json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'error' => false,
            'error_message' => null,
            'error_code' => null,
        ]), $status, ['Content-Type' => 'application/json']);
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
        ]), $status, ['Content-Type' => 'application/json']);
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
            'trace' => $trace,
        ]), 500, ['Content-Type' => 'application/json']);
    }

    public static function sendManualResponse(array $data, int $status = 200): Response
    {
        return new Response(json_encode($data), $status, ['Content-Type' => 'application/json']);
    }
}
