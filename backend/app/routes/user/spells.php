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

use App\App;
use App\Chat\Realm;
use App\Chat\Spell;
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
        ['GET']
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
        ['GET']
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
        ['GET']
    );
};
