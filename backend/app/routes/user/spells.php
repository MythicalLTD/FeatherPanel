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

use App\App;
use App\Chat\Realm;
use App\Chat\Spell;
use RateLimit\Rate;
use App\Chat\SpellVariable;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    // Get all realms (for spell selection)
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-realms-list',
        '/api/user/realms',
        function (Request $request) {
            $realms = Realm::getAll(null, 1000, 0); // Get all realms (up to 1000)

            return ApiResponse::success(['realms' => $realms], 'Realms fetched successfully', 200);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'user-spells'
    );

    // Get spells (optionally filtered by realm)
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-spells-list',
        '/api/user/spells',
        function (Request $request) {
            $realmId = $request->query->get('realm_id');
            $search = $request->query->get('search', '');

            // Get all spells (no realm filtering to allow cross-realm changes)
            // If realm_id is provided, it's just for organization/display purposes
            $spells = Spell::getAllSpells();

            // Filter by realm if provided (optional filtering)
            if ($realmId) {
                $spells = array_filter($spells, function ($spell) use ($realmId) {
                    return (int) $spell['realm_id'] === (int) $realmId;
                });
            }

            // Filter by search if provided
            if ($search) {
                $searchLower = strtolower($search);
                $spells = array_filter($spells, function ($spell) use ($searchLower) {
                    return strpos(strtolower($spell['name'] ?? ''), $searchLower) !== false
                        || strpos(strtolower($spell['description'] ?? ''), $searchLower) !== false;
                });
            }

            return ApiResponse::success(['spells' => array_values($spells)], 'Spells fetched successfully', 200);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'user-spells'
    );

    // Get spell details with variables
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-spell-details',
        '/api/user/spells/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Invalid spell ID', 'INVALID_ID', 400);
            }

            $spell = Spell::getSpellById((int) $id);
            if (!$spell) {
                return ApiResponse::error('Spell not found', 'SPELL_NOT_FOUND', 404);
            }

            $variables = SpellVariable::getVariablesBySpellId((int) $id);

            return ApiResponse::success([
                'spell' => $spell,
                'variables' => $variables,
            ], 'Spell details fetched successfully', 200);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'user-spells'
    );
};
