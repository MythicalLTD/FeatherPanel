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

namespace App\Chat;

use App\App;

/**
 * Per-node settings for reading daemon metrics (FeatherWings and FeatherQuilld nodes).
 *
 * metrics_url overrides where /metrics is scraped (for a dedicated metrics listener),
 * metrics_token is the daemon's scrape token and is stored encrypted. The token is
 * never returned to the browser; callers only learn whether one is set.
 */
class NodeMetricsSetting
{
    public const KIND_WINGS = 'wings';
    public const KIND_WEB = 'web';

    private static string $table = 'featherpanel_node_metrics_settings';

    public static function getTableName(): string
    {
        return self::$table;
    }

    public static function isValidKind(string $kind): bool
    {
        return $kind === self::KIND_WINGS || $kind === self::KIND_WEB;
    }

    /**
     * Settings for one node with the token decrypted, or defaults when none are saved.
     *
     * @return array{metrics_url: ?string, metrics_token: ?string}
     */
    public static function get(string $kind, int $nodeId): array
    {
        $defaults = ['metrics_url' => null, 'metrics_token' => null];
        if (!self::isValidKind($kind) || $nodeId <= 0) {
            return $defaults;
        }

        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('SELECT metrics_url, metrics_token FROM ' . self::$table . ' WHERE node_kind = :kind AND node_id = :id LIMIT 1');
            $stmt->execute(['kind' => $kind, 'id' => $nodeId]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        } catch (\Throwable) {
            // Table missing before the migration ran: behave as "not configured".
            return $defaults;
        }

        if (!is_array($row)) {
            return $defaults;
        }

        $token = null;
        if (is_string($row['metrics_token'] ?? null) && $row['metrics_token'] !== '') {
            try {
                $token = App::getInstance(true)->decryptValue($row['metrics_token']);
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->error('Failed to decrypt node metrics token: ' . $e->getMessage());
            }
        }

        $url = is_string($row['metrics_url'] ?? null) && trim($row['metrics_url']) !== '' ? trim($row['metrics_url']) : null;

        return ['metrics_url' => $url, 'metrics_token' => $token !== '' ? $token : null];
    }

    /**
     * Safe view for API responses (no token).
     *
     * @return array{metrics_url: ?string, has_metrics_token: bool}
     */
    public static function publicView(string $kind, int $nodeId): array
    {
        $settings = self::get($kind, $nodeId);

        return [
            'metrics_url' => $settings['metrics_url'],
            'has_metrics_token' => $settings['metrics_token'] !== null,
        ];
    }

    /**
     * Save settings. A null token keeps the stored one, an empty string clears it.
     */
    public static function save(string $kind, int $nodeId, ?string $metricsUrl, ?string $metricsToken): bool
    {
        if (!self::isValidKind($kind) || $nodeId <= 0) {
            return false;
        }

        $metricsUrl = $metricsUrl !== null && trim($metricsUrl) !== '' ? trim($metricsUrl) : null;
        $pdo = Database::getPdoConnection();

        if ($metricsToken === null) {
            $stmt = $pdo->prepare(
                'INSERT INTO ' . self::$table . ' (node_kind, node_id, metrics_url) VALUES (:kind, :id, :url)
                 ON DUPLICATE KEY UPDATE metrics_url = VALUES(metrics_url)'
            );

            return $stmt->execute(['kind' => $kind, 'id' => $nodeId, 'url' => $metricsUrl]);
        }

        $encrypted = trim($metricsToken) === '' ? null : App::getInstance(true)->encryptValue(trim($metricsToken));
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$table . ' (node_kind, node_id, metrics_url, metrics_token) VALUES (:kind, :id, :url, :token)
             ON DUPLICATE KEY UPDATE metrics_url = VALUES(metrics_url), metrics_token = VALUES(metrics_token)'
        );

        return $stmt->execute(['kind' => $kind, 'id' => $nodeId, 'url' => $metricsUrl, 'token' => $encrypted]);
    }

    public static function deleteForNode(string $kind, int $nodeId): void
    {
        if (!self::isValidKind($kind) || $nodeId <= 0) {
            return;
        }
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE node_kind = :kind AND node_id = :id');
            $stmt->execute(['kind' => $kind, 'id' => $nodeId]);
        } catch (\Throwable) {
        }
    }

    /**
     * Validate a metrics URL: absolute http(s) URL without credentials or fragment.
     */
    public static function validateUrl(string $url): ?string
    {
        $url = trim($url);
        if ($url === '') {
            return null;
        }
        if (strlen($url) > 512) {
            return 'metrics_url must be at most 512 characters';
        }
        $parts = parse_url($url);
        if (!is_array($parts) || !isset($parts['scheme'], $parts['host'])) {
            return 'metrics_url must be an absolute URL like http://10.0.0.5:9101/metrics';
        }
        if (!in_array(strtolower($parts['scheme']), ['http', 'https'], true)) {
            return 'metrics_url must use http or https';
        }
        if (isset($parts['user']) || isset($parts['pass']) || isset($parts['fragment'])) {
            return 'metrics_url must not contain credentials or a fragment';
        }

        return null;
    }
}
