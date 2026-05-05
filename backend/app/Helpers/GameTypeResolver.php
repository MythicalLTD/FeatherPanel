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
 * Resolves game type identifiers from server Spell configurations.
 *
 * Maps Spell (game egg) configurations to GameQ game type identifiers
 * using explicit configuration or pattern-based inference.
 */
class GameTypeResolver
{
    /**
     * Known spell name patterns mapped to game type identifiers.
     *
     * Keys are lowercase patterns to match against spell names.
     * Values are the corresponding game type identifiers.
     */
    private const KNOWN_MAPPINGS = [
        'minecraft' => 'minecraft',
        'minecraftbe' => 'minecraftbe',
        'minecraft (java)' => 'minecraft',
        'minecraft (bedrock)' => 'minecraftbe',
        'minecraft java' => 'minecraft',
        'minecraft bedrock' => 'minecraftbe',
        'cs2' => 'cs2',
        'counter-strike 2' => 'cs2',
        'counter strike 2' => 'cs2',
        'garrysmod' => 'garrysmod',
        "garry's mod" => 'garrysmod',
        'garrys mod' => 'garrysmod',
        'gmod' => 'garrysmod',
        'team fortress 2' => 'tf2',
        'tf2' => 'tf2',
        'rust' => 'rust',
        'ark: survival evolved' => 'arkse',
        'ark survival evolved' => 'arkse',
        'arkse' => 'arkse',
        'fivem' => 'fivem',
    ];

    /**
     * Realm name patterns mapped to game type identifiers.
     *
     * Used as a secondary inference source when spell name alone is ambiguous.
     */
    private const REALM_MAPPINGS = [
        'minecraft' => 'minecraft',
        'bedrock' => 'minecraftbe',
        'source' => 'cs2',
        'valve' => 'cs2',
        'rust' => 'rust',
        'fivem' => 'fivem',
        'gta' => 'fivem',
        'ark' => 'arkse',
    ];

    /**
     * Resolve the game type for a server from its spell data.
     *
     * @param array $server Server array containing 'spell' and optionally 'realm' keys
     *
     * @return string|null Game type identifier or null if unresolvable
     */
    public static function resolve(array $server): ?string
    {
        $spell = $server['spell'] ?? null;

        if ($spell === null || !\is_array($spell)) {
            return null;
        }

        return self::resolveFromSpell($spell, $server);
    }

    /**
     * Resolve the game type from a spell configuration.
     *
     * Resolution order:
     * 1. Check if the spell has a `gamedig_type` field
     * 2. Attempt inference from spell name and realm name
     * 3. Return null if unresolvable
     *
     * @param array $spell Spell configuration array with keys like 'name', 'gamedig_type'
     * @param array $server Optional server array for realm context
     *
     * @return string|null Game type identifier or null if unresolvable
     */
    public static function resolveFromSpell(array $spell, array $server = []): ?string
    {
        // 1. Check explicit gamedig_type field
        if (!empty($spell['gamedig_type']) && \is_string($spell['gamedig_type'])) {
            return $spell['gamedig_type'];
        }

        // 2. Attempt inference from spell name and realm name
        $spellName = $spell['name'] ?? null;
        if ($spellName !== null && \is_string($spellName)) {
            $realmName = null;

            if (isset($server['realm']['name']) && \is_string($server['realm']['name'])) {
                $realmName = $server['realm']['name'];
            }

            return self::inferFromName($spellName, $realmName);
        }

        // 3. Unresolvable
        return null;
    }

    /**
     * Get the known spell name to game type mappings.
     *
     * @return array<string, string> Mapping of lowercase spell name patterns to game type identifiers
     */
    public static function getKnownMappings(): array
    {
        return self::KNOWN_MAPPINGS;
    }

    /**
     * Infer the game type from a spell name and optional realm name.
     *
     * Performs case-insensitive matching against known patterns.
     * Checks exact matches first, then substring matches on the spell name,
     * and finally falls back to realm name matching.
     *
     * @param string $name Spell name to match against
     * @param string|null $realmName Optional realm name for additional context
     *
     * @return string|null Inferred game type identifier or null if no match
     */
    private static function inferFromName(string $name, ?string $realmName): ?string
    {
        $lowerName = strtolower(trim($name));

        // Exact match against known mappings
        if (isset(self::KNOWN_MAPPINGS[$lowerName])) {
            return self::KNOWN_MAPPINGS[$lowerName];
        }

        // Substring matching for partial spell names
        // Check more specific patterns first to avoid false positives
        if (str_contains($lowerName, 'minecraft') && str_contains($lowerName, 'bedrock')) {
            return 'minecraftbe';
        }

        if (str_contains($lowerName, 'minecraft')) {
            return 'minecraft';
        }

        if (str_contains($lowerName, 'counter-strike') || str_contains($lowerName, 'counter strike') || str_contains($lowerName, 'cs2')) {
            return 'cs2';
        }

        if (str_contains($lowerName, "garry's mod") || str_contains($lowerName, 'garrys mod') || str_contains($lowerName, 'garrysmod') || str_contains($lowerName, 'gmod')) {
            return 'garrysmod';
        }

        if (str_contains($lowerName, 'team fortress') || str_contains($lowerName, 'tf2')) {
            return 'tf2';
        }

        if ($lowerName === 'rust' || str_contains($lowerName, 'rust')) {
            return 'rust';
        }

        if (str_contains($lowerName, 'ark') && str_contains($lowerName, 'survival')) {
            return 'arkse';
        }

        if (str_contains($lowerName, 'fivem')) {
            return 'fivem';
        }

        // Fall back to realm name matching
        if ($realmName !== null) {
            $lowerRealm = strtolower(trim($realmName));

            if (isset(self::REALM_MAPPINGS[$lowerRealm])) {
                return self::REALM_MAPPINGS[$lowerRealm];
            }

            // Substring matching on realm name
            foreach (self::REALM_MAPPINGS as $pattern => $gameType) {
                if (str_contains($lowerRealm, $pattern)) {
                    return $gameType;
                }
            }
        }

        // 3. Unresolvable
        return null;
    }
}
