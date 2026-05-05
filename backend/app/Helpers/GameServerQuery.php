<?php

declare(strict_types=1);

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

use GameQ\GameQ;

/**
 * Game server query helper using the GameQ library.
 *
 * Wraps GameQ to query game servers for player status information
 * and normalizes the response into a standard format.
 */
class GameServerQuery
{
    /**
     * Mapping of FeatherPanel game types to GameQ protocol identifiers.
     */
    private const PROTOCOL_MAP = [
        'minecraft' => 'minecraft',
        'minecraftbe' => 'minecraftpe',
        'cs2' => 'csgo',
        'garrysmod' => 'gmod',
        'tf2' => 'tf2',
        'rust' => 'rust',
        'arkse' => 'arkse',
        'fivem' => 'cfx',
    ];

    /**
     * Query a game server for player status.
     *
     * @param string $gameType FeatherPanel game type identifier (e.g., 'minecraft', 'cs2', 'rust')
     * @param string $host Server IP/hostname
     * @param int $port Server query port
     * @param int $timeout Query timeout in seconds (default 5)
     *
     * @return array|null Normalized response or null on failure
     */
    public static function query(string $gameType, string $host, int $port, int $timeout = 5): ?array
    {
        try {
            $protocolId = self::getProtocolId($gameType);

            $gameq = new GameQ();
            $gameq->setOption('timeout', $timeout);
            $gameq->addServer([
                'type' => $protocolId,
                'host' => $host . ':' . $port,
                'id' => 'server',
            ]);

            $results = $gameq->process();

            if (!isset($results['server']) || empty($results['server'])) {
                return null;
            }

            $result = $results['server'];

            return self::normalizeResponse($result, $gameType);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Get the GameQ protocol class identifier for a given FeatherPanel game type.
     *
     * @param string $gameType FeatherPanel game type identifier
     *
     * @throws \InvalidArgumentException If the game type is not supported
     *
     * @return string GameQ protocol identifier
     */
    public static function getProtocolId(string $gameType): string
    {
        if (!isset(self::PROTOCOL_MAP[$gameType])) {
            throw new \InvalidArgumentException("Unsupported game type: {$gameType}");
        }

        return self::PROTOCOL_MAP[$gameType];
    }

    /**
     * Normalize the GameQ response into a standard format.
     *
     * @param array $result Raw GameQ result array for a server
     * @param string $gameType FeatherPanel game type identifier
     *
     * @return array Normalized response with keys: name, map, max_players, player_count, players, connect
     */
    public static function normalizeResponse(array $result, string $gameType): array
    {
        $name = $result['gq_hostname'] ?? $result['hostname'] ?? '';
        $map = $result['gq_mapname'] ?? $result['map'] ?? $result['mapname'] ?? '';
        $maxPlayers = (int) ($result['gq_maxplayers'] ?? $result['max_players'] ?? $result['maxplayers'] ?? $result['sv_maxclients'] ?? 0);
        $numPlayers = (int) ($result['gq_numplayers'] ?? $result['num_players'] ?? $result['numplayers'] ?? $result['clients'] ?? 0);

        $players = [];
        if (isset($result['players']) && is_array($result['players'])) {
            foreach ($result['players'] as $player) {
                $playerName = $player['gq_name'] ?? $player['name'] ?? $player['player'] ?? null;
                if ($playerName !== null && $playerName !== '') {
                    $players[] = $playerName;
                }
            }
        }

        $address = $result['gq_address'] ?? '';
        $port = $result['gq_port_client'] ?? 0;
        $connect = '';
        if (!empty($address) && $port > 0) {
            $connect = $address . ':' . $port;
        } elseif (!empty($address)) {
            $connect = $address;
        }

        return [
            'name' => $name,
            'map' => $map,
            'max_players' => $maxPlayers,
            'player_count' => $numPlayers,
            'players' => $players,
            'connect' => $connect,
        ];
    }
}
