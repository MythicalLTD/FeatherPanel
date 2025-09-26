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

namespace App\Controllers\System;

use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Info(
    title: 'FeatherPanel API',
    version: '1.0.0',
    description: 'The next generation of FeatherPanel API',
    contact: new OA\Contact(
        name: 'MythicalSystems',
        url: 'https://mythical.systems',
        email: 'support@mythical.systems'
    ),
    license: new OA\License(
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
    )
)]
#[OA\Server(
    url: '/',
    description: 'FeatherPanel API Server'
)]
#[OA\Tag(name: 'System', description: 'System configuration and settings')]
#[OA\Tag(name: 'Admin - Users', description: 'User management operations')]
#[OA\Tag(name: 'Admin - Servers', description: 'Server management operations')]
#[OA\Tag(name: 'Admin - Allocations', description: 'IP allocation management')]
#[OA\Tag(name: 'Admin - Nodes', description: 'Node management operations')]
#[OA\Tag(name: 'Admin - Realms', description: 'Realm management operations')]
#[OA\Tag(name: 'Admin - Spells', description: 'Spell (egg) management operations')]
#[OA\Tag(name: 'Admin - Roles', description: 'Role and permission management')]
#[OA\Tag(name: 'Admin - Plugins', description: 'Plugin management operations')]
#[OA\Tag(name: 'Admin - Settings', description: 'System settings management')]
#[OA\Tag(name: 'Admin - Dashboard', description: 'Dashboard and statistics')]
#[OA\Tag(name: 'Admin - Files', description: 'File management operations')]
#[OA\Tag(name: 'Admin - Logs', description: 'Log viewing and management')]
#[OA\Tag(name: 'Admin - Mail', description: 'Mail template management')]
#[OA\Tag(name: 'General', description: 'General API endpoints')]
class ApiDocs
{
    #[OA\Get(
        path: '/api/openapi.json',
        summary: 'Get OpenAPI specification',
        description: 'Retrieve the complete OpenAPI 3.1 specification for the FeatherPanel API, including all documented endpoints, schemas, and metadata.',
        tags: ['System'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'OpenAPI specification retrieved successfully',
                content: new OA\JsonContent(
                    type: 'object',
                    description: 'Complete OpenAPI 3.1 specification with all endpoints, schemas, and metadata'
                )
            ),
            new OA\Response(response: 500, description: 'Internal server error - Failed to generate OpenAPI specification'),
        ]
    )]
    public function index(Request $request): Response
    {
        // Suppress PHP warnings and errors to ensure clean JSON output
        $oldErrorReporting = error_reporting(0);
        ob_start();

        try {
            // Scan all controller directories
            $controllersDir = realpath(__DIR__ . '/../');
            $addonsDir = realpath(__DIR__ . '/../../storage/addons');

            $scanPaths = [$controllersDir];

            // Also scan addon controllers if they exist
            if ($addonsDir && is_dir($addonsDir)) {
                $scanPaths[] = $addonsDir;
            }

            $openapi = \OpenApi\Generator::scan($scanPaths);

            // Clean any output that might have been generated
            ob_end_clean();
            error_reporting($oldErrorReporting);

            // Return the generated OpenAPI spec
            return ApiResponse::sendManualResponse(
                json_decode($openapi->toJson(), true),
                200
            );

        } catch (\Exception $e) {
            // Clean any output and restore error reporting
            ob_end_clean();
            error_reporting($oldErrorReporting);

            // Return a basic OpenAPI spec if scanning fails
            return ApiResponse::sendManualResponse([
                'openapi' => '3.1.0',
                'info' => [
                    'title' => 'FeatherPanel API',
                    'version' => '1.0.0',
                    'description' => 'The next generation of FeatherPanel API',
                    'contact' => [
                        'name' => 'MythicalSystems',
                        'url' => 'https://mythical.systems',
                        'email' => 'support@mythical.systems',
                    ],
                    'license' => [
                        'name' => 'MIT',
                        'url' => 'https://opensource.org/licenses/MIT',
                    ],
                ],
                'servers' => [
                    [
                        'url' => '/api',
                        'description' => 'FeatherPanel API Server',
                    ],
                ],
                'paths' => [],
                'components' => new \stdClass(),
                'tags' => [
                    ['name' => 'System', 'description' => 'System configuration and settings'],
                    ['name' => 'Redirects', 'description' => 'Redirect link management'],
                ],
            ], 200);
        }
    }
}
