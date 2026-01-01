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

namespace App\Controllers\Admin;

use App\App;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Helpers\RateLimitConfig;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'RateLimitRoute',
    type: 'object',
    properties: [
        new OA\Property(property: 'route_name', type: 'string', description: 'The route name'),
        new OA\Property(property: 'per_second', type: 'integer', nullable: true, description: 'Rate limit per second'),
        new OA\Property(property: 'per_minute', type: 'integer', nullable: true, description: 'Rate limit per minute'),
        new OA\Property(property: 'per_hour', type: 'integer', nullable: true, description: 'Rate limit per hour'),
        new OA\Property(property: 'per_day', type: 'integer', nullable: true, description: 'Rate limit per day'),
        new OA\Property(property: 'namespace', type: 'string', nullable: true, description: 'Namespace for rate limiting'),
    ]
)]
class RateLimitController
{
    /**
     * Get all rate limit configurations.
     *
     * @param Request $request The HTTP request
     *
     * @return Response The HTTP response
     */
    #[OA\Get(
        path: '/api/admin/rate-limits',
        summary: 'Get all rate limit configurations',
        description: 'Retrieve all rate limit configurations for routes',
        tags: ['Admin - Rate Limits'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Rate limit configurations retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: '_enabled',
                            type: 'boolean',
                            description: 'Global rate limiting enabled flag'
                        ),
                        new OA\Property(
                            property: 'routes',
                            type: 'object',
                            additionalProperties: new OA\AdditionalProperties(ref: '#/components/schemas/RateLimitRoute'),
                            description: 'Rate limit configurations by route name'
                        ),
                    ]
                )
            ),
        ]
    )]
    public function index(Request $request): Response
    {
        $config = RateLimitConfig::getAllConfigs();

        return ApiResponse::success([
            '_enabled' => RateLimitConfig::isGloballyEnabled(),
            'routes' => $config['routes'] ?? [],
            'metadata' => [
                'total_routes' => count($config['routes'] ?? []),
            ],
        ], 'Rate limit configurations retrieved successfully', 200);
    }

    /**
     * Update global rate limiting enabled state.
     *
     * @param Request $request The HTTP request
     *
     * @return Response The HTTP response
     */
    #[OA\Patch(
        path: '/api/admin/rate-limits/global',
        summary: 'Update global rate limiting enabled state',
        description: 'Enable or disable rate limiting globally for all routes',
        tags: ['Admin - Rate Limits'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: '_enabled', type: 'boolean', description: 'Enable or disable rate limiting globally'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Global rate limiting state updated successfully'),
            new OA\Response(response: 400, description: 'Invalid request data'),
        ]
    )]
    public function updateGlobal(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON data', 'INVALID_JSON', 400);
        }

        if (!isset($data['_enabled']) || !is_bool($data['_enabled'])) {
            return ApiResponse::error('_enabled must be a boolean', 'INVALID_ENABLED', 400);
        }

        $configPath = RateLimitConfig::getConfigPath();
        try {
            $dir = dirname($configPath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            // Force reload from file to get latest state (don't use cache)
            RateLimitConfig::reloadConfig();

            // Load current config (this will create file if needed)
            $config = RateLimitConfig::getAllConfigs();

            // Ensure routes key exists
            if (!isset($config['routes'])) {
                $config['routes'] = [];
            }

            // Update the _enabled flag
            $enabledValue = (bool) $data['_enabled'];

            // Ensure _enabled is at the root level and routes exist
            $jsonData = [
                '_enabled' => $enabledValue,
                'routes' => $config['routes'] ?? [],
            ];

            $jsonString = json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";

            // Write with exclusive lock to prevent race conditions
            $result = @file_put_contents($configPath, $jsonString, LOCK_EX);

            // Immediately verify by reading the file back
            if ($result !== false) {
                usleep(10000); // Small delay to ensure disk write completes
                $readBack = @file_get_contents($configPath);
                if ($readBack !== false) {
                    $readBackDecoded = json_decode($readBack, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $actualEnabled = $readBackDecoded['_enabled'] ?? null;
                        if ($actualEnabled !== $enabledValue) {
                            // Write failed - try again
                            App::getInstance(true)->getLogger()->warning('First write verification failed, retrying...');
                            $result = @file_put_contents($configPath, $jsonString, LOCK_EX);
                        }
                    }
                }
            }

            if ($result === false) {
                $error = error_get_last();
                App::getInstance(true)->getLogger()->error('Failed to write rate limit config file: ' . $configPath . ' - ' . ($error['message'] ?? 'Unknown error'));

                return ApiResponse::error('Failed to update global rate limiting state', 'UPDATE_FAILED', 500);
            }

            // Flush any output buffers and sync to disk
            if (function_exists('fflush')) {
                $handle = fopen($configPath, 'r+');
                if ($handle) {
                    fflush($handle);
                    fclose($handle);
                }
            }

            // Verify the write succeeded by reading back
            clearstatcache(true, $configPath);
            chmod($configPath, 0644);

            // Read back to verify
            $verifyContent = @file_get_contents($configPath);
            if ($verifyContent !== false) {
                $verifyDecoded = json_decode($verifyContent, true);
                if (json_last_error() === JSON_ERROR_NONE && isset($verifyDecoded['_enabled'])) {
                    if ($verifyDecoded['_enabled'] !== $config['_enabled']) {
                        App::getInstance(true)->getLogger()->error('Config write verification failed. Expected: ' . ($config['_enabled'] ? 'true' : 'false') . ', Got: ' . ($verifyDecoded['_enabled'] ? 'true' : 'false'));
                    }
                }
            }

            // Reload config to ensure it's updated in memory
            RateLimitConfig::reloadConfig();

            // Log the activity
            Activity::createActivity([
                'user_uuid' => $request->attributes->get('user')['uuid'] ?? null,
                'name' => 'update_global_rate_limit',
                'context' => 'Updated global rate limiting state to: ' . ($data['_enabled'] ? 'enabled' : 'disabled'),
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success([
                '_enabled' => $data['_enabled'],
            ], 'Global rate limiting state updated successfully', 200);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to update global rate limiting state: ' . $e->getMessage());

            return ApiResponse::error('Failed to update global rate limiting state', 'UPDATE_FAILED', 500);
        }
    }

    /**
     * Get rate limit configuration for a specific route.
     *
     * @param Request $request The HTTP request
     * @param string $routeName The route name
     *
     * @return Response The HTTP response
     */
    #[OA\Get(
        path: '/api/admin/rate-limits/{routeName}',
        summary: 'Get rate limit configuration for a route',
        description: 'Retrieve rate limit configuration for a specific route',
        tags: ['Admin - Rate Limits'],
        parameters: [
            new OA\Parameter(
                name: 'routeName',
                in: 'path',
                required: true,
                description: 'The route name',
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Rate limit configuration retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/RateLimitRoute')
            ),
            new OA\Response(response: 404, description: 'Route not found'),
        ]
    )]
    public function show(Request $request, string $routeName): Response
    {
        $config = RateLimitConfig::getAllConfigs();

        if (!isset($config['routes'][$routeName])) {
            return ApiResponse::error('Rate limit configuration not found for route: ' . $routeName, 'ROUTE_NOT_FOUND', 404);
        }

        return ApiResponse::success([
            'route_name' => $routeName,
            ...$config['routes'][$routeName],
        ], 'Rate limit configuration retrieved successfully', 200);
    }

    /**
     * Update rate limit configuration for a route.
     *
     * @param Request $request The HTTP request
     * @param string $routeName The route name
     *
     * @return Response The HTTP response
     */
    #[OA\Put(
        path: '/api/admin/rate-limits/{routeName}',
        summary: 'Update rate limit configuration for a route',
        description: 'Update rate limit configuration for a specific route',
        tags: ['Admin - Rate Limits'],
        parameters: [
            new OA\Parameter(
                name: 'routeName',
                in: 'path',
                required: true,
                description: 'The route name',
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: '_enabled', type: 'boolean', nullable: true, description: 'Enable or disable rate limiting for this route'),
                    new OA\Property(property: 'per_second', type: 'integer', nullable: true),
                    new OA\Property(property: 'per_minute', type: 'integer', nullable: true),
                    new OA\Property(property: 'per_hour', type: 'integer', nullable: true),
                    new OA\Property(property: 'per_day', type: 'integer', nullable: true),
                    new OA\Property(property: 'namespace', type: 'string', nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Rate limit configuration updated successfully'),
            new OA\Response(response: 400, description: 'Invalid request data'),
            new OA\Response(response: 500, description: 'Failed to update configuration'),
        ]
    )]
    public function update(Request $request, string $routeName): Response
    {
        $data = json_decode($request->getContent(), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON data', 'INVALID_JSON', 400);
        }

        // If enabled, validate that at least one rate limit is provided
        $isEnabled = $data['_enabled'] ?? true; // Default to enabled for backward compatibility
        $hasRateLimit = isset($data['per_second']) || isset($data['per_minute']) || isset($data['per_hour']) || isset($data['per_day']);

        if ($isEnabled && !$hasRateLimit) {
            return ApiResponse::error('At least one rate limit (per_second, per_minute, per_hour, or per_day) must be provided when enabled', 'MISSING_RATE_LIMIT', 400);
        }

        // Validate rate limit values are positive integers
        $rateLimitFields = ['per_second', 'per_minute', 'per_hour', 'per_day'];
        foreach ($rateLimitFields as $field) {
            if (isset($data[$field])) {
                if (!is_numeric($data[$field]) || $data[$field] < 1) {
                    return ApiResponse::error("Invalid {$field} value. Must be a positive integer.", 'INVALID_RATE_LIMIT', 400);
                }
                $data[$field] = (int) $data[$field];
            }
        }

        // Validate namespace if provided
        if (isset($data['namespace']) && !is_string($data['namespace'])) {
            return ApiResponse::error('Namespace must be a string', 'INVALID_NAMESPACE', 400);
        }

        // Validate _enabled if provided
        if (isset($data['_enabled']) && !is_bool($data['_enabled'])) {
            return ApiResponse::error('_enabled must be a boolean', 'INVALID_ENABLED', 400);
        }

        // Update the configuration
        $success = RateLimitConfig::updateRouteConfig($routeName, $data);

        if (!$success) {
            return ApiResponse::error('Failed to update rate limit configuration', 'UPDATE_FAILED', 500);
        }

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $request->attributes->get('user')['uuid'] ?? null,
            'name' => 'update_rate_limit',
            'context' => "Updated rate limit for route: {$routeName}",
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'route_name' => $routeName,
            'config' => $data,
        ], 'Rate limit configuration updated successfully', 200);
    }

    /**
     * Delete rate limit configuration for a route (reset to default).
     *
     * @param Request $request The HTTP request
     * @param string $routeName The route name
     *
     * @return Response The HTTP response
     */
    #[OA\Delete(
        path: '/api/admin/rate-limits/{routeName}',
        summary: 'Delete rate limit configuration for a route',
        description: 'Delete (reset) rate limit configuration for a specific route, reverting to developer defaults',
        tags: ['Admin - Rate Limits'],
        parameters: [
            new OA\Parameter(
                name: 'routeName',
                in: 'path',
                required: true,
                description: 'The route name',
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Rate limit configuration deleted successfully'),
            new OA\Response(response: 404, description: 'Route not found'),
        ]
    )]
    public function delete(Request $request, string $routeName): Response
    {
        $config = RateLimitConfig::getAllConfigs();

        if (!isset($config['routes'][$routeName])) {
            return ApiResponse::error('Rate limit configuration not found for route: ' . $routeName, 'ROUTE_NOT_FOUND', 404);
        }

        // Remove the route configuration
        unset($config['routes'][$routeName]);

        // Ensure _enabled flag exists
        if (!isset($config['_enabled'])) {
            $config['_enabled'] = false;
        }

        // Ensure routes key exists
        if (!isset($config['routes'])) {
            $config['routes'] = [];
        }

        // Save the updated configuration
        $configPath = RateLimitConfig::getConfigPath();
        try {
            $dir = dirname($configPath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            $result = file_put_contents(
                $configPath,
                json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n"
            );

            if ($result === false) {
                return ApiResponse::error('Failed to delete rate limit configuration', 'DELETE_FAILED', 500);
            }

            RateLimitConfig::reloadConfig();
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to delete rate limit config: ' . $e->getMessage());

            return ApiResponse::error('Failed to delete rate limit configuration', 'DELETE_FAILED', 500);
        }

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $request->attributes->get('user')['uuid'] ?? null,
            'name' => 'delete_rate_limit',
            'context' => "Deleted rate limit configuration for route: {$routeName}",
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'route_name' => $routeName,
        ], 'Rate limit configuration deleted successfully', 200);
    }

    /**
     * Bulk update multiple rate limit configurations.
     *
     * @param Request $request The HTTP request
     *
     * @return Response The HTTP response
     */
    #[OA\Patch(
        path: '/api/admin/rate-limits/bulk',
        summary: 'Bulk update rate limit configurations',
        description: 'Update multiple rate limit configurations at once',
        tags: ['Admin - Rate Limits'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'routes',
                        type: 'object',
                        additionalProperties: new OA\AdditionalProperties(
                            type: 'object',
                            properties: [
                                new OA\Property(property: 'per_second', type: 'integer', nullable: true),
                                new OA\Property(property: 'per_minute', type: 'integer', nullable: true),
                                new OA\Property(property: 'per_hour', type: 'integer', nullable: true),
                                new OA\Property(property: 'per_day', type: 'integer', nullable: true),
                                new OA\Property(property: 'namespace', type: 'string', nullable: true),
                            ]
                        )
                    ),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Rate limit configurations updated successfully'),
            new OA\Response(response: 400, description: 'Invalid request data'),
        ]
    )]
    public function bulkUpdate(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON data', 'INVALID_JSON', 400);
        }

        if (!isset($data['routes']) || !is_array($data['routes'])) {
            return ApiResponse::error('Invalid request data. Expected "routes" object.', 'INVALID_DATA', 400);
        }

        $updated = [];
        $errors = [];

        foreach ($data['routes'] as $routeName => $routeConfig) {
            if (!is_string($routeName)) {
                $errors[] = "Invalid route name: {$routeName}";
                continue;
            }

            // Validate rate limit values
            $rateLimitFields = ['per_second', 'per_minute', 'per_hour', 'per_day'];
            $hasRateLimit = false;

            foreach ($rateLimitFields as $field) {
                if (isset($routeConfig[$field])) {
                    if (!is_numeric($routeConfig[$field]) || $routeConfig[$field] < 1) {
                        $errors[] = "Invalid {$field} value for route {$routeName}";
                        continue 2;
                    }
                    $routeConfig[$field] = (int) $routeConfig[$field];
                    $hasRateLimit = true;
                }
            }

            if (!$hasRateLimit) {
                $errors[] = "Route {$routeName} must have at least one rate limit";
                continue;
            }

            // Update the configuration
            if (RateLimitConfig::updateRouteConfig($routeName, $routeConfig)) {
                $updated[] = $routeName;
            } else {
                $errors[] = "Failed to update route {$routeName}";
            }
        }

        // Log the activity
        if (!empty($updated)) {
            Activity::createActivity([
                'user_uuid' => $request->attributes->get('user')['uuid'] ?? null,
                'name' => 'bulk_update_rate_limits',
                'context' => 'Bulk updated rate limits for routes: ' . implode(', ', $updated),
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);
        }

        return ApiResponse::success([
            'updated' => $updated,
            'errors' => $errors,
            'total_updated' => count($updated),
            'total_errors' => count($errors),
        ], 'Bulk update completed', 200);
    }
}
