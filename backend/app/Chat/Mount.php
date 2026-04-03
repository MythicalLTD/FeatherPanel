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
use App\Helpers\UUIDUtils;

class Mount
{
    public const MOUNTABLE_NODE = 'node';

    public const MOUNTABLE_SPELL = 'spell';

    public const MOUNTABLE_SERVER = 'server';

    /** @var string[] Disallowed host source paths */
    public static array $invalidSourcePaths = [
        '/etc/featherpanel',
        '/etc/pelican',
        '/var/lib/featherpanel/volumes',
        '/var/lib/pelican/volumes',
        '/var/lib/pterodactyl/volumes',
        '/etc/pterodactyl',
        '/srv/daemon-data',
    ];

    /** @var string[] Disallowed container targets (default data mount is reserved). */
    public static array $invalidTargetPaths = [
        '/home/container',
    ];

    private static string $table = 'featherpanel_mounts';

    private static string $pivot = 'featherpanel_mountables';

    public static function getMountById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function getMountByUuid(string $uuid): ?array
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $uuid]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function getMountByName(string $name): ?array
    {
        $name = trim($name);
        if ($name === '') {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE name = :name LIMIT 1');
        $stmt->execute(['name' => $name]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function searchMounts(int $page = 1, int $limit = 50, string $search = '', string $sortBy = 'id', string $sortOrder = 'ASC'): array
    {
        $page = max(1, $page);
        $limit = max(1, min(100, $limit));
        $offset = ($page - 1) * $limit;
        $allowedSort = ['id', 'name', 'uuid', 'created_at'];
        if (!in_array($sortBy, $allowedSort, true)) {
            $sortBy = 'id';
        }
        $sortOrder = strtoupper($sortOrder) === 'DESC' ? 'DESC' : 'ASC';

        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;
        $params = [];
        if ($search !== '') {
            $sql .= ' WHERE name LIKE :search OR uuid LIKE :search OR source LIKE :search';
            $params['search'] = '%' . $search . '%';
        }
        $sql .= ' ORDER BY ' . $sortBy . ' ' . $sortOrder . ' LIMIT :limit OFFSET :offset';
        $stmt = $pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function getMountsCount(string $search = ''): int
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table;
        $params = [];
        if ($search !== '') {
            $sql .= ' WHERE name LIKE :search OR uuid LIKE :search OR source LIKE :search';
            $params['search'] = '%' . $search . '%';
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /**
     * @param array{name:string,description?:?string,source:string,target:string,read_only?:bool,user_mountable?:bool} $data omit user_mountable for default true (Pelican admin create always enables this)
     */
    public static function createMount(array $data): int | false
    {
        if (!isset($data['name'], $data['source'], $data['target'])) {
            return false;
        }
        $name = trim((string) $data['name']);
        $source = trim((string) $data['source']);
        $target = trim((string) $data['target']);
        if ($name === '' || $source === '' || $target === '') {
            return false;
        }

        $userMountable = true;
        if (array_key_exists('user_mountable', $data)) {
            $userMountable = filter_var($data['user_mountable'], FILTER_VALIDATE_BOOLEAN);
        }
        $pdo = Database::getPdoConnection();
        $row = [
            'uuid' => UUIDUtils::generateV4(),
            'name' => $name,
            'description' => isset($data['description']) && $data['description'] !== '' ? (string) $data['description'] : null,
            'source' => $source,
            'target' => $target,
            'read_only' => filter_var($data['read_only'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
            'user_mountable' => $userMountable ? 1 : 0,
        ];
        $fields = array_keys($row);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (`' . implode('`,`', $fields) . '`) VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($row) ? (int) $pdo->lastInsertId() : false;
    }

    /**
     * @param array{name?:string,description?:?string,source?:string,target?:string,read_only?:bool|int,user_mountable?:bool|int} $data
     */
    public static function updateMountById(int $id, array $data): bool
    {
        if ($id <= 0) {
            return false;
        }
        $allowed = ['name', 'description', 'source', 'target', 'read_only', 'user_mountable'];
        $set = [];
        $params = ['id' => $id];
        foreach ($allowed as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }
            if (in_array($field, ['read_only', 'user_mountable'], true)) {
                $set[] = "`$field` = :$field";
                $params[$field] = filter_var($data[$field], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
            } elseif ($field === 'description') {
                $set[] = "`$field` = :$field";
                $v = $data[$field];
                $params[$field] = $v === null || $v === '' ? null : (string) $v;
            } else {
                $set[] = "`$field` = :$field";
                $params[$field] = (string) $data[$field];
            }
        }
        if ($set === []) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(', ', $set) . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($params);
    }

    public static function deleteMountById(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        if (self::countServersForMount($id) > 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    public static function countServersForMount(int $mountId): int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$pivot . ' WHERE mount_id = :mid AND mountable_type = :t');
        $stmt->execute(['mid' => $mountId, 't' => self::MOUNTABLE_SERVER]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * @return int[]
     */
    public static function getMountableIds(int $mountId, string $type): array
    {
        if ($mountId <= 0 || !in_array($type, [self::MOUNTABLE_NODE, self::MOUNTABLE_SPELL, self::MOUNTABLE_SERVER], true)) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT mountable_id FROM ' . self::$pivot . ' WHERE mount_id = :m AND mountable_type = :t ORDER BY mountable_id ASC'
        );
        $stmt->execute(['m' => $mountId, 't' => $type]);
        $out = [];
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $out[] = (int) $row['mountable_id'];
        }

        return $out;
    }

    /**
     * Replace all pivot links for one mount (nodes, spells, or servers assigned to this mount).
     *
     * @param int[] $entityIds node IDs, spell IDs, or server IDs depending on $type
     */
    public static function replaceLinksFromMount(int $mountId, string $type, array $entityIds): bool
    {
        if ($mountId <= 0 || !in_array($type, [self::MOUNTABLE_NODE, self::MOUNTABLE_SPELL, self::MOUNTABLE_SERVER], true)) {
            return false;
        }
        $entityIds = array_values(array_unique(array_filter(array_map('intval', $entityIds), fn ($i) => $i > 0)));
        $pdo = Database::getPdoConnection();
        try {
            $pdo->beginTransaction();
            $del = $pdo->prepare('DELETE FROM ' . self::$pivot . ' WHERE mount_id = :m AND mountable_type = :t');
            $del->execute(['m' => $mountId, 't' => $type]);
            if ($entityIds !== []) {
                $ins = $pdo->prepare(
                    'INSERT INTO ' . self::$pivot . ' (mount_id, mountable_type, mountable_id) VALUES (:m, :t, :id)'
                );
                foreach ($entityIds as $i) {
                    $ins->execute(['m' => $mountId, 't' => $type, 'id' => $i]);
                }
            }
            $pdo->commit();
        } catch (\PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            App::getInstance(true)->getLogger()->error('Mount replaceLinksFromMount failed: ' . $e->getMessage());

            return false;
        }

        return true;
    }

    /**
     * Whitelist sources for Wings allowed_mounts on a node (mounts explicitly linked to the node).
     *
     * @return string[]
     */
    public static function getAllowedSourcesForNode(int $nodeId): array
    {
        if ($nodeId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        // Mounts linked to this node, plus mounts with no node restriction (empty node pivot = all nodes).
        $sql = 'SELECT DISTINCT m.`source` FROM ' . self::$table . ' m WHERE (
            EXISTS (
                SELECT 1 FROM ' . self::$pivot . ' p
                WHERE p.mount_id = m.id AND p.mountable_type = :nt AND p.mountable_id = :nid
            )
            OR NOT EXISTS (
                SELECT 1 FROM ' . self::$pivot . ' p2
                WHERE p2.mount_id = m.id AND p2.mountable_type = :nt2
            )
        )';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'nt' => self::MOUNTABLE_NODE,
            'nid' => $nodeId,
            'nt2' => self::MOUNTABLE_NODE,
        ]);
        $out = [];
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $out[] = (string) $row['source'];
        }

        return $out;
    }

    /**
     * @return list<array{source:string,target:string,read_only:bool}>
     */
    public static function getWingsMountsForServer(int $serverId): array
    {
        if ($serverId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT m.source, m.target, m.read_only FROM ' . self::$table . ' m
            INNER JOIN ' . self::$pivot . ' p ON p.mount_id = m.id
            WHERE p.mountable_type = :st AND p.mountable_id = :sid';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['st' => self::MOUNTABLE_SERVER, 'sid' => $serverId]);
        $out = [];
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $out[] = [
                'source' => (string) $row['source'],
                'target' => (string) $row['target'],
                'read_only' => (bool) (int) $row['read_only'],
            ];
        }

        return $out;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function getMountsAttachedToServer(int $serverId): array
    {
        if ($serverId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT m.* FROM ' . self::$table . ' m
            INNER JOIN ' . self::$pivot . ' p ON p.mount_id = m.id
            WHERE p.mountable_type = :st AND p.mountable_id = :sid
            ORDER BY m.name ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['st' => self::MOUNTABLE_SERVER, 'sid' => $serverId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Mounts that may be toggled for this server (node + spell constraints).
     *
     * @param ?int $spellIdOverride When set (e.g. draft spell in admin UI), filter by this spell instead of the server's stored spell_id.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getAssignableMountsForServer(int $serverId, ?int $spellIdOverride = null): array
    {
        $server = Server::getServerById($serverId);
        if (!$server) {
            return [];
        }
        $nodeId = (int) $server['node_id'];
        $spellId = ($spellIdOverride !== null && $spellIdOverride > 0) ? $spellIdOverride : (int) $server['spell_id'];
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT m.* FROM ' . self::$table . ' m WHERE (
                NOT EXISTS (
                    SELECT 1 FROM ' . self::$pivot . ' pn
                    WHERE pn.mount_id = m.id AND pn.mountable_type = :nodeType
                )
                OR EXISTS (
                    SELECT 1 FROM ' . self::$pivot . ' pn
                    WHERE pn.mount_id = m.id
                        AND pn.mountable_type = :nodeType2
                        AND pn.mountable_id = :nodeId
                )
            )
            AND (
                NOT EXISTS (
                    SELECT 1 FROM ' . self::$pivot . ' ps
                    WHERE ps.mount_id = m.id AND ps.mountable_type = :spellType
                )
                OR EXISTS (
                    SELECT 1 FROM ' . self::$pivot . ' ps
                    WHERE ps.mount_id = m.id
                        AND ps.mountable_type = :spellType2
                        AND ps.mountable_id = :spellId
                )
            )
            ORDER BY m.name ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'nodeType' => self::MOUNTABLE_NODE,
            'nodeType2' => self::MOUNTABLE_NODE,
            'nodeId' => $nodeId,
            'spellType' => self::MOUNTABLE_SPELL,
            'spellType2' => self::MOUNTABLE_SPELL,
            'spellId' => $spellId,
        ]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Remove all pivot rows for a deleted node, spell, or server (polymorphic target).
     */
    public static function deletePivotLinksForMountable(string $type, int $entityId, ?\PDO $pdo = null): bool
    {
        if ($entityId <= 0 || !in_array($type, [self::MOUNTABLE_NODE, self::MOUNTABLE_SPELL, self::MOUNTABLE_SERVER], true)) {
            return false;
        }
        $pdo ??= Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'DELETE FROM ' . self::$pivot . ' WHERE mountable_type = :t AND mountable_id = :id'
        );

        return $stmt->execute(['t' => $type, 'id' => $entityId]);
    }

    public static function mountAppliesToNode(int $mountId, int $nodeId): bool
    {
        $ids = self::getMountableIds($mountId, self::MOUNTABLE_NODE);

        return $ids === [] || in_array($nodeId, $ids, true);
    }

    public static function mountAppliesToSpell(int $mountId, int $spellId): bool
    {
        $ids = self::getMountableIds($mountId, self::MOUNTABLE_SPELL);

        return $ids === [] || in_array($spellId, $ids, true);
    }

    /**
     * @param int[] $mountIds
     */
    public static function validateMountIdsForContext(int $nodeId, int $spellId, array $mountIds): ?string
    {
        if ($nodeId <= 0 || $spellId <= 0) {
            return 'Invalid node or spell';
        }
        foreach ($mountIds as $mid) {
            $mid = (int) $mid;
            if ($mid <= 0) {
                return 'Invalid mount id';
            }
            $mount = self::getMountById($mid);
            if (!$mount) {
                return 'Mount not found';
            }
            if (!self::mountAppliesToNode($mid, $nodeId)) {
                return 'Mount "' . $mount['name'] . '" is not allowed on this node';
            }
            if (!self::mountAppliesToSpell($mid, $spellId)) {
                return 'Mount "' . $mount['name'] . '" is not allowed for this spell';
            }
        }

        return null;
    }

    /**
     * @param int[] $mountIds
     */
    public static function validateMountsForServer(int $serverId, array $mountIds): ?string
    {
        $server = Server::getServerById($serverId);
        if (!$server) {
            return 'Server not found';
        }
        $nodeId = (int) $server['node_id'];
        $spellId = (int) $server['spell_id'];
        foreach ($mountIds as $mid) {
            $mid = (int) $mid;
            if ($mid <= 0) {
                return 'Invalid mount id';
            }
            $mount = self::getMountById($mid);
            if (!$mount) {
                return 'Mount not found';
            }
            if (!self::mountAppliesToNode($mid, $nodeId)) {
                return 'Mount "' . $mount['name'] . '" is not allowed on this node';
            }
            if (!self::mountAppliesToSpell($mid, $spellId)) {
                return 'Mount "' . $mount['name'] . '" is not allowed for this spell';
            }
        }

        return null;
    }

    /**
     * Remove server→mount links that no longer match the server's node and spell (e.g. after spell_id change).
     * Pelican/Filament does not auto-run this in all cases; we enforce consistency so Wings never receives invalid mounts.
     */
    public static function pruneServerMountsToMatchContext(int $serverId, ?\PDO $txPdo = null): bool
    {
        $server = Server::getServerById($serverId);
        if (!$server) {
            return false;
        }
        $nodeId = (int) $server['node_id'];
        $spellId = (int) $server['spell_id'];
        $attached = self::getMountsAttachedToServer($serverId);
        $keep = [];
        foreach ($attached as $m) {
            $mid = (int) $m['id'];
            if (self::mountAppliesToNode($mid, $nodeId) && self::mountAppliesToSpell($mid, $spellId)) {
                $keep[] = $mid;
            }
        }

        return self::syncServerMounts($serverId, $keep, $txPdo);
    }

    /**
     * Replace which mounts are enabled for a server (pivot rows: mount_id × server).
     *
     * @param int[] $mountIds
     */
    public static function syncServerMounts(int $serverId, array $mountIds, ?\PDO $txPdo = null): bool
    {
        if ($serverId <= 0) {
            return false;
        }
        $mountIds = array_values(array_unique(array_filter(array_map('intval', $mountIds), fn ($i) => $i > 0)));
        $ownTransaction = $txPdo === null;
        $pdo = $txPdo ?? Database::getPdoConnection();
        try {
            if ($ownTransaction) {
                $pdo->beginTransaction();
            }
            $del = $pdo->prepare(
                'DELETE FROM ' . self::$pivot . ' WHERE mountable_type = :st AND mountable_id = :sid'
            );
            $del->execute(['st' => self::MOUNTABLE_SERVER, 'sid' => $serverId]);
            if ($mountIds !== []) {
                $ins = $pdo->prepare(
                    'INSERT INTO ' . self::$pivot . ' (mount_id, mountable_type, mountable_id) VALUES (:m, :t, :sid)'
                );
                foreach ($mountIds as $m) {
                    $ins->execute(['m' => $m, 't' => self::MOUNTABLE_SERVER, 'sid' => $serverId]);
                }
            }
            if ($ownTransaction) {
                $pdo->commit();
            }
        } catch (\PDOException $e) {
            if ($ownTransaction && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            App::getInstance(true)->getLogger()->error('syncServerMounts failed: ' . $e->getMessage());

            return false;
        }

        return true;
    }
}
