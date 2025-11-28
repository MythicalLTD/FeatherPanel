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
        summary: 'Import Pterodactyl data (deprecated)',
        description: 'Deprecated: Direct HTTP import is no longer supported. Use the external Pterodactyl Migration Agent instead.',
        tags: ['Admin - Pterodactyl Importer'],
        responses: [
            new OA\Response(
                response: 410,
                description: 'Deprecated - Import must be performed via the Pterodactyl Migration Agent'
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function import(Request $request): Response
    {
        return ApiResponse::error(
            'Direct HTTP import is no longer supported. Please use the Pterodactyl Migration Agent (curl -sSL https://get.featherpanel.com/beta.sh | bash).',
            'PTERODACTYL_IMPORT_DEPRECATED',
            410
        );
    }
}
