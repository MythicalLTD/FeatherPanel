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

class WebSpaceDomain
{
    private static string $table = 'featherpanel_webspace_domains';

    /**
     * @return list<array{id: int, domain: string, type: string, redirect_target: ?string, document_root: string}>
     */
    public static function listForWebspaceId(int $webspaceId): array
    {
        if ($webspaceId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT id, domain, type, redirect_target, document_root FROM ' . self::$table
            . ' WHERE webspace_id = :id ORDER BY id ASC'
        );
        $stmt->execute(['id' => $webspaceId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        return array_map(static function (array $row): array {
            return [
                'id' => (int) ($row['id'] ?? 0),
                'domain' => strtolower(trim((string) ($row['domain'] ?? ''))),
                'type' => strtolower(trim((string) ($row['type'] ?? 'alias'))),
                'redirect_target' => isset($row['redirect_target']) && $row['redirect_target'] !== ''
                    ? (string) $row['redirect_target']
                    : null,
                'document_root' => WebPlate::normalizeDocumentRoot($row['document_root'] ?? ''),
            ];
        }, $rows);
    }

    /**
     * @param list<array{domain: string, type?: string, redirect_target?: ?string}> $routes
     *
     * @return list<string> flat domain hostnames
     */
    public static function replaceForWebspace(int $webspaceId, array $routes): array
    {
        $normalized = self::normalizeRoutes($routes);
        if ($webspaceId <= 0) {
            return array_column($normalized, 'domain');
        }

        foreach ($normalized as $route) {
            $conflict = self::findOwnerId($route['domain'], $webspaceId);
            if ($conflict !== null) {
                throw new \InvalidArgumentException("Domain '{$route['domain']}' is already used by another WebSpace");
            }
        }

        $pdo = Database::getPdoConnection();
        $pdo->beginTransaction();
        try {
            $delete = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE webspace_id = :id');
            $delete->execute(['id' => $webspaceId]);

            $insert = $pdo->prepare(
                'INSERT INTO ' . self::$table . ' (webspace_id, domain, type, redirect_target, document_root) VALUES (:webspace_id, :domain, :type, :redirect_target, :document_root)'
            );
            foreach ($normalized as $route) {
                $insert->execute([
                    'webspace_id' => $webspaceId,
                    'domain' => $route['domain'],
                    'type' => $route['type'],
                    'redirect_target' => $route['redirect_target'],
                    'document_root' => $route['document_root'],
                ]);
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        return array_column($normalized, 'domain');
    }

    public static function migrateLegacyFromJson(int $webspaceId, array $flatDomains): void
    {
        if ($webspaceId <= 0 || self::listForWebspaceId($webspaceId) !== []) {
            return;
        }

        $routes = [];
        foreach ($flatDomains as $index => $domain) {
            if (!is_string($domain) || trim($domain) === '') {
                continue;
            }
            $routes[] = [
                'domain' => $domain,
                'type' => $index === 0 ? 'primary' : 'alias',
            ];
        }

        if ($routes !== []) {
            self::replaceForWebspace($webspaceId, $routes);
        }
    }

    public static function findOwnerId(string $domain, ?int $exceptWebspaceId = null): ?int
    {
        $domain = strtolower(trim(rtrim(trim($domain), '.')));
        if ($domain === '') {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $sql = 'SELECT webspace_id FROM ' . self::$table . ' WHERE domain = :domain';
        $params = ['domain' => $domain];
        if ($exceptWebspaceId !== null && $exceptWebspaceId > 0) {
            $sql .= ' AND webspace_id <> :except';
            $params['except'] = $exceptWebspaceId;
        }
        $sql .= ' LIMIT 1';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $owner = $stmt->fetchColumn();

        return $owner !== false ? (int) $owner : null;
    }

    /**
     * @param list<array{domain: string, type?: string, redirect_target?: ?string, document_root?: string}> $routes
     *
     * @return list<array{domain: string, type: string, redirect_target: ?string, document_root: string}>
     */
    public static function normalizeRoutes(array $routes): array
    {
        $normalized = [];
        foreach ($routes as $route) {
            if (!is_array($route)) {
                continue;
            }
            $domain = strtolower(trim(rtrim(trim((string) ($route['domain'] ?? '')), '.')));
            if ($domain === '') {
                continue;
            }
            $type = strtolower(trim((string) ($route['type'] ?? 'alias')));
            if (!in_array($type, ['primary', 'alias', 'redirect'], true)) {
                $type = 'alias';
            }
            $target = isset($route['redirect_target']) ? trim((string) $route['redirect_target']) : null;
            if ($type === 'redirect' && ($target === null || $target === '')) {
                throw new \InvalidArgumentException("Redirect domain '{$domain}' requires redirect_target");
            }
            $normalized[] = [
                'domain' => $domain,
                'type' => $type,
                'redirect_target' => $type === 'redirect' ? $target : null,
                'document_root' => WebPlate::normalizeDocumentRoot($route['document_root'] ?? ''),
            ];
        }

        if ($normalized !== [] && !in_array('primary', array_column($normalized, 'type'), true)) {
            $normalized[0]['type'] = 'primary';
        }

        $seen = [];
        $unique = [];
        foreach ($normalized as $route) {
            if (isset($seen[$route['domain']])) {
                continue;
            }
            $seen[$route['domain']] = true;
            $unique[] = $route;
        }

        return $unique;
    }

    /**
     * Derive apex hostname (strip leading www.).
     */
    public static function apexFromDomain(string $domain): string
    {
        $domain = strtolower(trim(rtrim(trim($domain), '.')));
        if (str_starts_with($domain, 'www.')) {
            return substr($domain, 4);
        }

        return $domain;
    }

    /**
     * Detect current www preference from routes: apex | www | none.
     *
     * @param list<array{domain?: string, type?: string, redirect_target?: ?string}> $routes
     */
    public static function detectWwwPreference(array $routes): string
    {
        $normalized = self::normalizeRoutes($routes);
        $primary = null;
        foreach ($normalized as $route) {
            if (($route['type'] ?? '') === 'primary') {
                $primary = $route['domain'];
                break;
            }
        }
        if ($primary === null && $normalized !== []) {
            $primary = $normalized[0]['domain'];
        }
        if ($primary === null || $primary === '') {
            return 'none';
        }

        $apex = self::apexFromDomain($primary);
        $www = 'www.' . $apex;
        $schemeTargetApex = null;
        $schemeTargetWww = null;
        foreach ($normalized as $route) {
            if (($route['type'] ?? '') !== 'redirect') {
                continue;
            }
            $target = strtolower(trim((string) ($route['redirect_target'] ?? '')));
            if ($route['domain'] === $www && (str_contains($target, '://' . $apex) || str_ends_with(rtrim($target, '/'), $apex))) {
                $schemeTargetApex = true;
            }
            if ($route['domain'] === $apex && (str_contains($target, '://' . $www) || str_contains($target, $www))) {
                $schemeTargetWww = true;
            }
        }

        if ($primary === $apex && $schemeTargetApex) {
            return 'apex';
        }
        if ($primary === $www && $schemeTargetWww) {
            return 'www';
        }

        return 'none';
    }

    /**
     * Rewrite routes so www redirects to apex, or apex redirects to www.
     *
     * @param list<array{domain?: string, type?: string, redirect_target?: ?string, document_root?: string}> $routes
     * @param 'apex'|'www'|'none' $preference
     *
     * @return list<array{domain: string, type: string, redirect_target: ?string, document_root: string}>
     */
    public static function applyWwwPreference(array $routes, string $preference, bool $ssl = true): array
    {
        $preference = strtolower(trim($preference));
        if (!in_array($preference, ['apex', 'www', 'none'], true)) {
            $preference = 'none';
        }

        $normalized = self::normalizeRoutes($routes);
        if ($normalized === [] || $preference === 'none') {
            // Drop managed www↔apex redirects only when clearing preference.
            if ($preference === 'none' && $normalized !== []) {
                $primary = null;
                foreach ($normalized as $route) {
                    if ($route['type'] === 'primary') {
                        $primary = $route['domain'];
                        break;
                    }
                }
                $apex = self::apexFromDomain($primary ?? $normalized[0]['domain']);
                $www = 'www.' . $apex;
                $filtered = [];
                foreach ($normalized as $route) {
                    if ($route['type'] === 'redirect' && ($route['domain'] === $www || $route['domain'] === $apex)) {
                        continue;
                    }
                    $filtered[] = $route;
                }

                return self::normalizeRoutes($filtered);
            }

            return $normalized;
        }

        $primary = null;
        foreach ($normalized as $route) {
            if ($route['type'] === 'primary') {
                $primary = $route['domain'];
                break;
            }
        }
        if ($primary === null) {
            $primary = $normalized[0]['domain'];
        }

        $apex = self::apexFromDomain($primary);
        if ($apex === '') {
            return $normalized;
        }
        $www = 'www.' . $apex;
        $scheme = $ssl ? 'https' : 'http';

        $primaryRoot = '';
        foreach ($normalized as $route) {
            if ($route['domain'] === $apex || $route['domain'] === $www) {
                if (($route['type'] ?? '') !== 'redirect' && ($route['document_root'] ?? '') !== '') {
                    $primaryRoot = $route['document_root'];
                    break;
                }
            }
        }

        $keep = [];
        foreach ($normalized as $route) {
            if ($route['domain'] === $apex || $route['domain'] === $www) {
                continue;
            }
            $keep[] = $route;
        }

        if ($preference === 'apex') {
            array_unshift($keep, [
                'domain' => $www,
                'type' => 'redirect',
                'redirect_target' => $scheme . '://' . $apex,
                'document_root' => '',
            ]);
            array_unshift($keep, [
                'domain' => $apex,
                'type' => 'primary',
                'redirect_target' => null,
                'document_root' => $primaryRoot,
            ]);
        } else {
            array_unshift($keep, [
                'domain' => $apex,
                'type' => 'redirect',
                'redirect_target' => $scheme . '://' . $www,
                'document_root' => '',
            ]);
            array_unshift($keep, [
                'domain' => $www,
                'type' => 'primary',
                'redirect_target' => null,
                'document_root' => $primaryRoot,
            ]);
        }

        return self::normalizeRoutes($keep);
    }
}
