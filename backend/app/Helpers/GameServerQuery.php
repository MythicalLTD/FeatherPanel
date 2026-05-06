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

/**
 * Game server query helper.
 *
 * Uses native PHP implementations for Minecraft (Server List Ping protocol)
 * and the GameQ library for other game types (Source Engine, FiveM, etc.).
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
     * @param int $port Server game port
     * @param int $timeout Query timeout in seconds (default 5)
     *
     * @return array|null Normalized response or null on failure
     */
    public static function query(string $gameType, string $host, int $port, int $timeout = 5): ?array
    {
        // Use native Minecraft SLP for Java Edition (works on game port, no enable-query needed)
        if ($gameType === 'minecraft') {
            return self::queryMinecraftJava($host, $port, $timeout);
        }

        // Use native Bedrock ping for Bedrock Edition
        if ($gameType === 'minecraftbe') {
            return self::queryMinecraftBedrock($host, $port, $timeout);
        }

        // For other games, try GameQ if available
        return self::queryGameQ($gameType, $host, $port, $timeout);
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
        if (isset($result['players']) && \is_array($result['players'])) {
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

    /**
     * Query a Minecraft Java Edition server using the Server List Ping (SLP) protocol.
     *
     * This uses the same protocol as the Minecraft client's server list.
     * Works on the game port directly — no enable-query needed.
     *
     * @param string $host Server IP/hostname
     * @param int $port Server port (game port)
     * @param int $timeout Timeout in seconds
     *
     * @return array|null Normalized response or null on failure
     */
    private static function queryMinecraftJava(string $host, int $port, int $timeout): ?array
    {
        try {
            $socket = @fsockopen($host, $port, $errno, $errstr, $timeout);

            if (!$socket) {
                return null;
            }

            stream_set_timeout($socket, $timeout);

            // Build handshake packet
            $handshake = self::mcPackVarInt(0x00); // Packet ID: Handshake
            $handshake .= self::mcPackVarInt(767); // Protocol version (1.21.1)
            $handshake .= self::mcPackString($host); // Server address
            $handshake .= pack('n', $port); // Server port (unsigned short, big-endian)
            $handshake .= self::mcPackVarInt(1); // Next state: Status

            // Send handshake
            $packet = self::mcPackVarInt(\strlen($handshake)) . $handshake;
            fwrite($socket, $packet);

            // Send status request
            $statusRequest = self::mcPackVarInt(0x00); // Packet ID: Status Request
            $packet = self::mcPackVarInt(\strlen($statusRequest)) . $statusRequest;
            fwrite($socket, $packet);

            // Read response
            $length = self::mcReadVarInt($socket);
            if ($length < 1) {
                fclose($socket);

                return null;
            }

            // Read packet ID
            self::mcReadVarInt($socket);

            // Read JSON string length
            $jsonLength = self::mcReadVarInt($socket);
            if ($jsonLength < 1) {
                fclose($socket);

                return null;
            }

            // Read JSON data
            $jsonData = '';
            $remaining = $jsonLength;
            while ($remaining > 0) {
                $chunk = fread($socket, min($remaining, 8192));
                if ($chunk === false || $chunk === '') {
                    break;
                }
                $jsonData .= $chunk;
                $remaining -= \strlen($chunk);
            }

            fclose($socket);

            if (empty($jsonData)) {
                return null;
            }

            $data = json_decode($jsonData, true);
            if (!$data) {
                return null;
            }

            // Parse the response
            $players = [];
            if (isset($data['players']['sample']) && \is_array($data['players']['sample'])) {
                foreach ($data['players']['sample'] as $player) {
                    $name = $player['name'] ?? '';
                    if ($name !== '' && $name !== '???') {
                        $players[] = $name;
                    }
                }
            }

            // Extract MOTD (can be string or chat component)
            $motd = '';
            if (isset($data['description'])) {
                if (\is_string($data['description'])) {
                    $motd = $data['description'];
                } elseif (\is_array($data['description']) && isset($data['description']['text'])) {
                    $motd = $data['description']['text'];
                }
            }

            // Extract version info
            $version = $data['version']['name'] ?? null;

            return [
                'name' => strip_tags(preg_replace('/§[0-9a-fk-or]/i', '', $motd) ?? $motd),
                'map' => 'world',
                'max_players' => (int) ($data['players']['max'] ?? 0),
                'player_count' => (int) ($data['players']['online'] ?? 0),
                'players' => $players,
                'connect' => $host . ':' . $port,
                'version' => $version,
            ];
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Query a Minecraft Bedrock Edition server using the Unconnected Ping protocol.
     *
     * @param string $host Server IP/hostname
     * @param int $port Server port
     * @param int $timeout Timeout in seconds
     *
     * @return array|null Normalized response or null on failure
     */
    private static function queryMinecraftBedrock(string $host, int $port, int $timeout): ?array
    {
        try {
            $socket = @fsockopen('udp://' . $host, $port, $errno, $errstr, $timeout);

            if (!$socket) {
                return null;
            }

            stream_set_timeout($socket, $timeout);

            // Unconnected Ping packet
            $packet = "\x01"; // Packet ID
            $packet .= pack('J', time()); // Timestamp (int64 big-endian)
            $packet .= "\x00\xff\xff\x00\xfe\xfe\xfe\xfe\xfd\xfd\xfd\xfd\x12\x34\x56\x78"; // Magic
            $packet .= pack('J', 0); // Client GUID

            fwrite($socket, $packet);

            $response = fread($socket, 4096);
            fclose($socket);

            if ($response === false || \strlen($response) < 35) {
                return null;
            }

            // Skip header (35 bytes: 1 byte ID + 8 bytes timestamp + 8 bytes server GUID + 16 bytes magic + 2 bytes string length)
            $data = substr($response, 35);

            // Parse semicolon-separated fields
            $fields = explode(';', $data);

            if (\count($fields) < 6) {
                return null;
            }

            $motd = $fields[1] ?? '';
            $playerCount = (int) ($fields[4] ?? 0);
            $maxPlayers = (int) ($fields[5] ?? 0);

            return [
                'name' => $motd,
                'map' => 'world',
                'max_players' => $maxPlayers,
                'player_count' => $playerCount,
                'players' => [], // Bedrock ping doesn't return player names
                'connect' => $host . ':' . $port,
            ];
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Query a game server using the GameQ library (for Source Engine, FiveM, etc.).
     *
     * @param string $gameType FeatherPanel game type identifier
     * @param string $host Server IP/hostname
     * @param int $port Server port
     * @param int $timeout Timeout in seconds
     *
     * @return array|null Normalized response or null on failure
     */
    private static function queryGameQ(string $gameType, string $host, int $port, int $timeout): ?array
    {
        try {
            if (!class_exists('\\GameQ\\GameQ')) {
                return null;
            }

            $protocolId = self::getProtocolId($gameType);

            $gameq = new \GameQ\GameQ();
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

    // --- Minecraft Protocol Helpers ---

    /**
     * Pack an integer as a Minecraft VarInt.
     */
    private static function mcPackVarInt(int $value): string
    {
        $result = '';
        while (true) {
            $byte = $value & 0x7F;
            $value >>= 7;
            if ($value !== 0) {
                $byte |= 0x80;
            }
            $result .= \chr($byte);
            if ($value === 0) {
                break;
            }
        }

        return $result;
    }

    /**
     * Pack a string with VarInt length prefix for Minecraft protocol.
     */
    private static function mcPackString(string $string): string
    {
        return self::mcPackVarInt(\strlen($string)) . $string;
    }

    /**
     * Read a VarInt from a socket stream.
     */
    private static function mcReadVarInt($socket): int
    {
        $value = 0;
        $size = 0;

        while (true) {
            $byte = fread($socket, 1);
            if ($byte === false || $byte === '') {
                return -1;
            }
            $byte = \ord($byte);
            $value |= ($byte & 0x7F) << ($size * 7);
            ++$size;
            if ($size > 5) {
                return -1; // VarInt too big
            }
            if (($byte & 0x80) === 0) {
                break;
            }
        }

        return $value;
    }
}
