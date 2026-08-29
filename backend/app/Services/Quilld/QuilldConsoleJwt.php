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

namespace App\Services\Quilld;

/**
 * Compact HS256 JWT for FeatherQuilld WebSpace console WebSockets.
 *
 * Signed with the web node's daemon_token; kid is daemon_token_id so Quilld
 * can verify against its local Config.Token / TokenId.
 */
class QuilldConsoleJwt
{
    public const DEFAULT_TTL_SECONDS = 600;

    /**
     * Build a compact JWT: header.payload.signature (base64url).
     */
    /**
     * @param list<string> $permissions Console permission claims (e.g. console.output, console.send, or *)
     */
    public static function create(
        string $webspaceUuid,
        string $daemonTokenId,
        string $daemonToken,
        int $ttlSeconds = self::DEFAULT_TTL_SECONDS,
        array $permissions = ['*'],
        ?string $userUuid = null,
    ): string {
        $now = time();
        $header = self::base64UrlEncode(json_encode([
            'alg' => 'HS256',
            'typ' => 'JWT',
            'kid' => $daemonTokenId,
        ], JSON_UNESCAPED_SLASHES));

        $perms = array_values(array_filter(array_map('strval', $permissions), static fn ($p) => $p !== ''));
        if ($perms === []) {
            $perms = ['*'];
        }

        $payloadData = [
            'sub' => $webspaceUuid,
            'exp' => $now + max(1, $ttlSeconds),
            'scope' => 'websocket',
            'iat' => $now,
            'permissions' => $perms,
        ];
        if ($userUuid !== null && $userUuid !== '') {
            $payloadData['user'] = $userUuid;
        }

        $payload = self::base64UrlEncode(json_encode($payloadData, JSON_UNESCAPED_SLASHES));

        $signingInput = $header . '.' . $payload;
        $signature = self::base64UrlEncode(
            hash_hmac('sha256', $signingInput, $daemonToken, true)
        );

        return $signingInput . '.' . $signature;
    }

    /**
     * Build wss/ws URL for Quilld console WebSocket.
     *
     * @param array<string, mixed> $webNode
     */
    public static function buildSocketUrl(array $webNode, string $webspaceUuid): string
    {
        $scheme = strtolower(trim((string) ($webNode['scheme'] ?? 'http'))) === 'https' ? 'wss' : 'ws';
        $fqdn = trim((string) ($webNode['fqdn'] ?? ''));
        $port = (int) ($webNode['daemonListen'] ?? 8989);
        if ($port < 1 || $port > 65535) {
            $port = 8989;
        }

        return "{$scheme}://{$fqdn}:{$port}/api/webspaces/{$webspaceUuid}/ws";
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
