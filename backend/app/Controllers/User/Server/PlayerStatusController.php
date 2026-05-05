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

namespace App\Controllers\User\Server;

use App\Helpers\ApiResponse;
use App\Helpers\PlayerStatusService;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class PlayerStatusController
{
    /**
     * Get the player status for a game server.
     *
     * Returns player count, max players, player names, game type,
     * last updated timestamp, staleness indicator, server name, and address.
     */
    public function getPlayerStatus(Request $request, string $uuidShort): Response
    {
        $data = PlayerStatusService::getPlayerStatus($uuidShort);

        if ($data === null) {
            // Game type is unsupported or no data available
            return ApiResponse::success([
                'player_count' => 0,
                'max_players' => 0,
                'players' => [],
                'game_type' => null,
                'last_updated' => gmdate('Y-m-d\TH:i:s\Z'),
                'is_stale' => false,
                'server_name' => '',
                'address' => '',
            ]);
        }

        return ApiResponse::success([
            'player_count' => $data['player_count'] ?? 0,
            'max_players' => $data['max_players'] ?? 0,
            'players' => $data['players'] ?? [],
            'game_type' => $data['game_type'] ?? null,
            'last_updated' => $data['last_updated'] ?? gmdate('Y-m-d\TH:i:s\Z'),
            'is_stale' => $data['is_stale'] ?? false,
            'server_name' => $data['server_name'] ?? '',
            'address' => $data['address'] ?? '',
        ]);
    }
}
