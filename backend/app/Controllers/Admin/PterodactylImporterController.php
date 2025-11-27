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

namespace App\Controllers\Admin;

use App\Chat\Node;
use App\Chat\User;
use App\Chat\Realm;
use App\Chat\Spell;
use App\Chat\Server;
use App\Chat\Location;
use App\Chat\Allocation;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\DatabaseInstance;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class PterodactylImporterController
{
    #[OA\Get(
        path: '/api/admin/pterodactyl-importer/prerequisites',
        summary: 'Check prerequisites for Pterodactyl import',
        description: 'Verify that the panel meets the requirements for importing Pterodactyl data. Checks user count (must be <= 1), nodes (must be 0), locations (must be 0), realms (must be 0), spells (must be 0), servers (must be 0), databases (must be 0), and allocations (must be 0).',
        tags: ['Admin - Pterodactyl Importer'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Prerequisites check completed successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'users_count', type: 'integer', description: 'Current number of users', example: 1),
                        new OA\Property(property: 'nodes_count', type: 'integer', description: 'Current number of nodes', example: 0),
                        new OA\Property(property: 'locations_count', type: 'integer', description: 'Current number of locations', example: 0),
                        new OA\Property(property: 'realms_count', type: 'integer', description: 'Current number of realms', example: 0),
                        new OA\Property(property: 'spells_count', type: 'integer', description: 'Current number of spells', example: 0),
                        new OA\Property(property: 'servers_count', type: 'integer', description: 'Current number of servers', example: 0),
                        new OA\Property(property: 'databases_count', type: 'integer', description: 'Current number of databases', example: 0),
                        new OA\Property(property: 'allocations_count', type: 'integer', description: 'Current number of allocations', example: 0),
                        new OA\Property(property: 'panel_clean', type: 'boolean', description: 'Whether all prerequisites are met', example: true),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function prerequisites(Request $request): Response
    {
        try {
            // Get counts for all entities
            $usersCount = User::getCount();
            $nodesCount = Node::getNodesCount();
            $locationsCount = Location::getCount();
            $realmsCount = Realm::getCount();
            $spellsCount = Spell::getSpellsCount();
            $serversCount = Server::getCount();
            $databasesCount = DatabaseInstance::getDatabasesCount();
            $allocationsCount = Allocation::getCount();

            // Check if panel is clean (all prerequisites met)
            $panelClean =
                $usersCount <= 1
                && $nodesCount === 0
                && $locationsCount === 0
                && $realmsCount === 0
                && $spellsCount === 0
                && $serversCount === 0
                && $databasesCount === 0
                && $allocationsCount === 0;

            return ApiResponse::success(
                [
                    'users_count' => $usersCount,
                    'nodes_count' => $nodesCount,
                    'locations_count' => $locationsCount,
                    'realms_count' => $realmsCount,
                    'spells_count' => $spellsCount,
                    'servers_count' => $serversCount,
                    'databases_count' => $databasesCount,
                    'allocations_count' => $allocationsCount,
                    'panel_clean' => $panelClean,
                ],
                'Prerequisites check completed',
                200
            );
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to check prerequisites: ' . $e->getMessage(), 'PREREQUISITES_CHECK_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/pterodactyl-importer/import',
        summary: 'Import Pterodactyl data',
        description: 'Import Pterodactyl data from SQL dump and/or .env file. Requires all prerequisites to be met before importing.',
        tags: ['Admin - Pterodactyl Importer'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    properties: [
                        new OA\Property(
                            property: 'sql_dump',
                            type: 'string',
                            format: 'binary',
                            description: 'SQL dump file (.sql format only)'
                        ),
                        new OA\Property(
                            property: 'env_file',
                            type: 'string',
                            format: 'binary',
                            description: 'Environment configuration file (.env) - Required for database encryption key'
                        ),
                    ],
                    required: ['sql_dump', 'env_file']
                )
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Import completed successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Pterodactyl data imported successfully'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing files, prerequisites not met, or invalid file format'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Import failed'),
        ]
    )]
    public function import(Request $request): Response
    {
        try {
            // First, check prerequisites
            $usersCount = User::getCount();
            $nodesCount = Node::getNodesCount();
            $locationsCount = Location::getCount();
            $realmsCount = Realm::getCount();
            $spellsCount = Spell::getSpellsCount();
            $serversCount = Server::getCount();
            $databasesCount = DatabaseInstance::getDatabasesCount();
            $allocationsCount = Allocation::getCount();

            $panelClean =
                $usersCount <= 1
                && $nodesCount === 0
                && $locationsCount === 0
                && $realmsCount === 0
                && $spellsCount === 0
                && $serversCount === 0
                && $databasesCount === 0
                && $allocationsCount === 0;

            if (!$panelClean) {
                return ApiResponse::error(
                    'Prerequisites not met. Please ensure the panel is completely empty before importing.',
                    'PREREQUISITES_NOT_MET',
                    400
                );
            }

            // Get uploaded files
            $files = $request->files->all();
            $sqlDumpFile = $files['sql_dump'] ?? null;
            $envFile = $files['env_file'] ?? null;

            // Both files are required
            if (!$sqlDumpFile) {
                return ApiResponse::error('SQL dump file (.sql) is required', 'NO_SQL_DUMP_FILE', 400);
            }

            if (!$envFile) {
                return ApiResponse::error('.env configuration file is required (contains database encryption key)', 'NO_ENV_FILE', 400);
            }

            // Validate SQL dump file
            if ($sqlDumpFile->getError() !== UPLOAD_ERR_OK) {
                return ApiResponse::error('SQL dump file upload error', 'SQL_DUMP_UPLOAD_ERROR', 400);
            }

            $sqlDumpPath = $sqlDumpFile->getPathname();
            $sqlDumpExtension = strtolower(pathinfo($sqlDumpFile->getClientOriginalName(), PATHINFO_EXTENSION));

            // Validate file extension (only .sql files are supported)
            if ($sqlDumpExtension !== 'sql') {
                return ApiResponse::error('SQL dump file must be .sql format', 'INVALID_SQL_DUMP_FORMAT', 400);
            }

            // Validate file is not empty
            if ($sqlDumpFile->getSize() === 0) {
                return ApiResponse::error('SQL dump file is empty', 'EMPTY_SQL_DUMP_FILE', 400);
            }

            // Check file size (limit to 500MB)
            $maxFileSize = 500 * 1024 * 1024; // 500MB
            if ($sqlDumpFile->getSize() > $maxFileSize) {
                return ApiResponse::error('SQL dump file is too large. Maximum size is 500MB', 'SQL_DUMP_FILE_TOO_LARGE', 400);
            }

            // Validate .env file
            if ($envFile->getError() !== UPLOAD_ERR_OK) {
                return ApiResponse::error('.env file upload error', 'ENV_FILE_UPLOAD_ERROR', 400);
            }

            $envFilePath = $envFile->getPathname();
            $envFileExtension = strtolower(pathinfo($envFile->getClientOriginalName(), PATHINFO_EXTENSION));

            // Validate file extension (allow .env or no extension)
            if ($envFileExtension !== 'env' && $envFileExtension !== '') {
                return ApiResponse::error('.env file must be .env format', 'INVALID_ENV_FILE_FORMAT', 400);
            }

            // Validate .env file is not empty
            if ($envFile->getSize() === 0) {
                return ApiResponse::error('.env file is empty', 'EMPTY_ENV_FILE', 400);
            }

            // Check .env file size (limit to 10MB)
            $maxEnvFileSize = 10 * 1024 * 1024; // 10MB
            if ($envFile->getSize() > $maxEnvFileSize) {
                return ApiResponse::error('.env file is too large. Maximum size is 10MB', 'ENV_FILE_TOO_LARGE', 400);
            }

            // TODO: Implement actual import logic here
            // This is a placeholder - the actual import implementation would:
            // 1. Parse the SQL dump file (.sql format)
            // 2. Map Pterodactyl data to FeatherPanel structure
            // 3. Import users, servers, nodes, locations, realms, spells, etc.
            // 4. Skip excluded data (server activities, API keys, activity logs, etc.)
            // 5. Handle data transformation and validation

            return ApiResponse::success(
                [
                    'message' => 'Pterodactyl data import initiated successfully',
                    'sql_dump_uploaded' => true,
                    'sql_dump_file_name' => $sqlDumpFile->getClientOriginalName(),
                    'sql_dump_file_size' => $sqlDumpFile->getSize(),
                    'env_file_uploaded' => true,
                    'env_file_name' => $envFile->getClientOriginalName(),
                    'env_file_size' => $envFile->getSize(),
                ],
                'Import process started',
                200
            );
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to import Pterodactyl data: ' . $e->getMessage(), 'IMPORT_ERROR', 500);
        }
    }
}
