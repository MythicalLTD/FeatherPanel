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
 * WebSpace model — FeatherQuilld hosted workspaces (panel-owned; daemon pulls config).
 * Templates are WebPlates — never Spells.
 */
class WebSpace
{
    private static string $table = 'featherpanel_webspaces';

    /** @var array<int, string> */
    private static array $allowedFields = [
        'id',
        'uuid',
        'uuidShort',
        'name',
        'description',
        'web_node_id',
        'webplate_id',
        'hosting_package_id',
        'disk',
        'cpu_limit',
        'memory_limit',
        'bandwidth_limit_gb',
        'bandwidth_used_bytes',
        'bandwidth_period_start',
        'waf_enabled',
        'waf_deny_ips',
        'waf_deny_paths',
        'database_limit',
        'mailbox_limit',
        'domains',
        'ssl',
        'dns_status',
        'dns_checked_at',
        'backend_port',
        'backend_host',
        'document_root',
        'image',
        'ssl_mode',
        'status',
        'state',
        'owner_id',
    ];

    public static function isValidUuid(string $uuid): bool
    {
        return (bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $uuid);
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        if (empty($data['uuid']) || !self::isValidUuid((string) $data['uuid'])) {
            $data['uuid'] = self::generateUuid();
        }

        if (empty($data['uuidShort']) || !preg_match('/^[a-f0-9]{8}$/i', (string) $data['uuidShort'])) {
            $data['uuidShort'] = strtolower(substr(str_replace('-', '', (string) $data['uuid']), 0, 8));
        } else {
            $data['uuidShort'] = strtolower((string) $data['uuidShort']);
        }

        if (empty($data['name']) || empty($data['web_node_id']) || empty($data['webplate_id'])) {
            App::getInstance(true)->getLogger()->error('WebSpace create missing name, web_node_id, or webplate_id');

            return false;
        }

        $data['web_node_id'] = (int) $data['web_node_id'];
        if (!WebNode::getWebNodeById($data['web_node_id'])) {
            App::getInstance(true)->getLogger()->error('WebSpace create: invalid web_node_id ' . $data['web_node_id']);

            return false;
        }

        $data['webplate_id'] = (int) $data['webplate_id'];
        $plate = WebPlate::getById($data['webplate_id']);
        if (!$plate) {
            App::getInstance(true)->getLogger()->error('WebSpace create: invalid webplate_id ' . $data['webplate_id']);

            return false;
        }

        $data['disk'] = isset($data['disk']) && is_numeric($data['disk']) ? (int) $data['disk'] : 1024;
        $data['cpu_limit'] = isset($data['cpu_limit']) && is_numeric($data['cpu_limit'])
            ? max(0, (float) $data['cpu_limit'])
            : 0;
        $data['memory_limit'] = isset($data['memory_limit']) && is_numeric($data['memory_limit'])
            ? max(0, (int) $data['memory_limit'])
            : 0;
        if (array_key_exists('bandwidth_limit_gb', $data) && $data['bandwidth_limit_gb'] !== null && $data['bandwidth_limit_gb'] !== '') {
            $data['bandwidth_limit_gb'] = max(0, (int) $data['bandwidth_limit_gb']);
        }
        $data['waf_enabled'] = !empty($data['waf_enabled']) ? 1 : 0;
        if (array_key_exists('waf_deny_ips', $data)) {
            $data['waf_deny_ips'] = self::encodeDenyIps($data['waf_deny_ips']);
        }
        if (array_key_exists('waf_deny_paths', $data)) {
            $data['waf_deny_paths'] = self::encodeDenyPaths($data['waf_deny_paths']);
        }
        $data['database_limit'] = isset($data['database_limit']) && is_numeric($data['database_limit'])
            ? max(0, (int) $data['database_limit'])
            : 1;
        $data['mailbox_limit'] = isset($data['mailbox_limit']) && is_numeric($data['mailbox_limit'])
            ? max(0, (int) $data['mailbox_limit'])
            : 0;
        $data['ssl'] = !empty($data['ssl']) ? 1 : 0;
        $data['backend_port'] = isset($data['backend_port']) && is_numeric($data['backend_port'])
            ? (int) $data['backend_port']
            : 0;
        $data['document_root'] = trim((string) ($data['document_root'] ?? '')) !== ''
            ? WebPlate::normalizeDocumentRoot($data['document_root'])
            : WebPlate::normalizeDocumentRoot($plate['document_root'] ?? '');
        $data['status'] = trim((string) ($data['status'] ?? 'installing')) ?: 'installing';
        $data['state'] = trim((string) ($data['state'] ?? 'stopped')) ?: 'stopped';

        if (empty($data['image']) && !empty($plate['docker_image'])) {
            $data['image'] = (string) $plate['docker_image'];
        }

        if (isset($data['domains'])) {
            $data['domains'] = self::encodeDomains($data['domains']);
        } else {
            $data['domains'] = json_encode([]);
        }

        $filtered = array_intersect_key($data, array_flip(self::$allowedFields));
        $pdo = Database::getPdoConnection();
        $fields = array_keys($filtered);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (`' . implode('`,`', $fields) . '`) VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);

        if ($stmt->execute($filtered)) {
            return (int) $pdo->lastInsertId();
        }

        App::getInstance(true)->getLogger()->error('Failed to create WebSpace: ' . json_encode($stmt->errorInfo()));

        return false;
    }

    /** @return array<string, mixed>|null */
    public static function getById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        return self::fetchOne('w.id = :id', ['id' => $id]);
    }

    /** @return array<string, mixed>|null */
    public static function getByUuid(string $uuid): ?array
    {
        if (!self::isValidUuid($uuid)) {
            return null;
        }

        return self::fetchOne('w.uuid = :uuid', ['uuid' => $uuid]);
    }

    /** @return array<string, mixed>|null */
    public static function getByUuidAndNodeId(string $uuid, int $webNodeId): ?array
    {
        if (!self::isValidUuid($uuid) || $webNodeId <= 0) {
            return null;
        }

        return self::fetchOne('w.uuid = :uuid AND w.web_node_id = :node', [
            'uuid' => $uuid,
            'node' => $webNodeId,
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function listByWebplateId(int $webplateId): array
    {
        if ($webplateId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT w.*, p.name AS webplate_name, p.runtime AS webplate_runtime, n.name AS web_node_name,
                u.username AS owner_username, u.uuid AS owner_uuid, u.email AS owner_email
            FROM ' . self::$table . ' w
            LEFT JOIN featherpanel_webplates p ON p.id = w.webplate_id
            LEFT JOIN featherpanel_web_nodes n ON n.id = w.web_node_id
            LEFT JOIN featherpanel_users u ON u.id = w.owner_id
            WHERE w.webplate_id = :plate
            ORDER BY w.id DESC'
        );
        $stmt->execute(['plate' => $webplateId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        return array_map([self::class, 'hydrate'], $rows);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function listByNodeId(int $webNodeId): array
    {
        if ($webNodeId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT w.*, p.name AS webplate_name, p.runtime AS webplate_runtime, n.name AS web_node_name,
                u.username AS owner_username, u.uuid AS owner_uuid, u.email AS owner_email
            FROM ' . self::$table . ' w
            LEFT JOIN featherpanel_webplates p ON p.id = w.webplate_id
            LEFT JOIN featherpanel_web_nodes n ON n.id = w.web_node_id
            LEFT JOIN featherpanel_users u ON u.id = w.owner_id
            WHERE w.web_node_id = :node
            ORDER BY w.id DESC'
        );
        $stmt->execute(['node' => $webNodeId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        return array_map([self::class, 'hydrate'], $rows);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function listAll(
        int $page = 1,
        int $limit = 50,
        ?string $search = null,
        ?int $webNodeId = null,
        ?int $ownerId = null,
    ): array {
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $pdo = Database::getPdoConnection();
        $sql = 'SELECT w.*, p.name AS webplate_name, p.runtime AS webplate_runtime, n.name AS web_node_name,
                u.username AS owner_username, u.uuid AS owner_uuid, u.email AS owner_email
            FROM ' . self::$table . ' w
            LEFT JOIN featherpanel_webplates p ON p.id = w.webplate_id
            LEFT JOIN featherpanel_web_nodes n ON n.id = w.web_node_id
            LEFT JOIN featherpanel_users u ON u.id = w.owner_id';
        $params = [];
        $where = [];
        if ($search !== null && trim($search) !== '') {
            $where[] = '(w.name LIKE :search OR w.uuid LIKE :search OR w.uuidShort LIKE :search OR p.name LIKE :search OR n.name LIKE :search OR u.username LIKE :search)';
            $params['search'] = '%' . trim($search) . '%';
        }
        if ($webNodeId !== null && $webNodeId > 0) {
            $where[] = 'w.web_node_id = :web_node_id';
            $params['web_node_id'] = $webNodeId;
        }
        if ($ownerId !== null && $ownerId > 0) {
            $where[] = 'w.owner_id = :owner_id';
            $params['owner_id'] = $ownerId;
        }
        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY w.id DESC LIMIT :limit OFFSET :offset';

        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        return array_map([self::class, 'hydrate'], $rows);
    }

    public static function countAll(?string $search = null, ?int $webNodeId = null, ?int $ownerId = null): int
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table . ' w
            LEFT JOIN featherpanel_webplates p ON p.id = w.webplate_id
            LEFT JOIN featherpanel_web_nodes n ON n.id = w.web_node_id
            LEFT JOIN featherpanel_users u ON u.id = w.owner_id';
        $params = [];
        $where = [];
        if ($search !== null && trim($search) !== '') {
            $where[] = '(w.name LIKE :search OR w.uuid LIKE :search OR w.uuidShort LIKE :search OR p.name LIKE :search OR n.name LIKE :search OR u.username LIKE :search)';
            $params['search'] = '%' . trim($search) . '%';
        }
        if ($webNodeId !== null && $webNodeId > 0) {
            $where[] = 'w.web_node_id = :web_node_id';
            $params['web_node_id'] = $webNodeId;
        }
        if ($ownerId !== null && $ownerId > 0) {
            $where[] = 'w.owner_id = :owner_id';
            $params['owner_id'] = $ownerId;
        }
        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    public static function updateStatus(string $uuid, string $status): bool
    {
        if (!self::isValidUuid($uuid)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET status = :status WHERE uuid = :uuid');

        return $stmt->execute(['status' => $status, 'uuid' => $uuid]);
    }

    public static function updateRuntimeState(string $uuid, string $state, ?int $backendPort = null): bool
    {
        if (!self::isValidUuid($uuid)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        if ($backendPort !== null) {
            $stmt = $pdo->prepare(
                'UPDATE ' . self::$table . ' SET state = :state, backend_port = :port WHERE uuid = :uuid'
            );

            return $stmt->execute([
                'state' => $state,
                'port' => max(0, $backendPort),
                'uuid' => $uuid,
            ]);
        }

        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET state = :state WHERE uuid = :uuid');

        return $stmt->execute(['state' => $state, 'uuid' => $uuid]);
    }

    public static function updateDnsStatus(string $uuid, string $status): bool
    {
        if (!self::isValidUuid($uuid)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table . ' SET dns_status = :status, dns_checked_at = CURRENT_TIMESTAMP WHERE uuid = :uuid'
        );

        return $stmt->execute(['status' => $status, 'uuid' => $uuid]);
    }

    public static function updateBandwidthUsage(string $uuid, int $usedBytes, ?string $periodStart = null): bool
    {
        if (!self::isValidUuid($uuid)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        if ($periodStart !== null && $periodStart !== '') {
            $stmt = $pdo->prepare(
                'UPDATE ' . self::$table
                . ' SET bandwidth_used_bytes = :used, bandwidth_period_start = :period WHERE uuid = :uuid'
            );

            return $stmt->execute([
                'used' => max(0, $usedBytes),
                'period' => $periodStart,
                'uuid' => $uuid,
            ]);
        }

        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table . ' SET bandwidth_used_bytes = :used WHERE uuid = :uuid'
        );

        return $stmt->execute(['used' => max(0, $usedBytes), 'uuid' => $uuid]);
    }

    /**
     * @param array<string, mixed> $row
     */
    public static function resolveBandwidthLimitGb(array $row): int
    {
        if (array_key_exists('bandwidth_limit_gb', $row) && $row['bandwidth_limit_gb'] !== null && $row['bandwidth_limit_gb'] !== '') {
            return max(0, (int) $row['bandwidth_limit_gb']);
        }

        $packageId = (int) ($row['hosting_package_id'] ?? 0);
        if ($packageId <= 0) {
            return 0;
        }

        $pkg = HostingPackage::getById($packageId);

        return max(0, (int) ($pkg['bandwidth_limit_gb'] ?? 0));
    }

    public static function updateWebNodeId(string $uuid, int $webNodeId): bool
    {
        if (!self::isValidUuid($uuid) || $webNodeId <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET web_node_id = :node WHERE uuid = :uuid');

        return $stmt->execute(['node' => $webNodeId, 'uuid' => $uuid]);
    }

    /**
     * Post-provision settings update (name, description, domains, ssl, disk, document_root).
     *
     * @param array<string, mixed> $fields
     */
    public static function update(string $uuid, array $fields): bool
    {
        if (!self::isValidUuid($uuid)) {
            return false;
        }

        $allowed = ['name', 'description', 'domains', 'domain_routes', 'ssl', 'ssl_mode', 'disk', 'document_root', 'webplate_id', 'image', 'waf_enabled', 'waf_deny_ips', 'waf_deny_paths', 'cpu_limit', 'memory_limit', 'bandwidth_limit_gb', 'backend_host'];
        $updates = [];
        $params = ['uuid' => $uuid];

        if (isset($fields['domain_routes']) && is_array($fields['domain_routes'])) {
            $existing = self::getByUuid($uuid);
            if (!$existing) {
                return false;
            }
            try {
                $flat = WebSpaceDomain::replaceForWebspace((int) ($existing['id'] ?? 0), $fields['domain_routes']);
                $fields['domains'] = $flat;
            } catch (\InvalidArgumentException $e) {
                App::getInstance(true)->getLogger()->error('WebSpace domain routes invalid: ' . $e->getMessage());

                return false;
            }
        }

        if (isset($fields['name'])) {
            $name = trim((string) $fields['name']);
            if ($name === '') {
                return false;
            }
            $updates[] = 'name = :name';
            $params['name'] = $name;
        }

        if (array_key_exists('description', $fields)) {
            $updates[] = 'description = :description';
            $params['description'] = (string) ($fields['description'] ?? '');
        }

        if (isset($fields['domains'])) {
            $updates[] = 'domains = :domains';
            $params['domains'] = self::encodeDomains($fields['domains']);
        }

        if (array_key_exists('ssl', $fields)) {
            $updates[] = 'ssl = :ssl';
            $params['ssl'] = !empty($fields['ssl']) ? 1 : 0;
        }

        if (array_key_exists('ssl_mode', $fields)) {
            $mode = strtolower(trim((string) $fields['ssl_mode']));
            $updates[] = 'ssl_mode = :ssl_mode';
            $params['ssl_mode'] = match ($mode) {
                'custom' => 'custom',
                'dns01' => 'dns01',
                default => 'acme',
            };
        }

        if (isset($fields['webplate_id']) && is_numeric($fields['webplate_id'])) {
            $updates[] = 'webplate_id = :webplate_id';
            $params['webplate_id'] = (int) $fields['webplate_id'];
        }

        if (array_key_exists('image', $fields)) {
            $updates[] = 'image = :image';
            $params['image'] = trim((string) ($fields['image'] ?? '')) ?: null;
        }

        if (isset($fields['disk']) && is_numeric($fields['disk'])) {
            $updates[] = 'disk = :disk';
            $params['disk'] = max(1, (int) $fields['disk']);
        }

        if (array_key_exists('database_limit', $fields) && is_numeric($fields['database_limit'])) {
            $updates[] = 'database_limit = :database_limit';
            $params['database_limit'] = max(0, (int) $fields['database_limit']);
        }

        if (array_key_exists('mailbox_limit', $fields) && is_numeric($fields['mailbox_limit'])) {
            $updates[] = 'mailbox_limit = :mailbox_limit';
            $params['mailbox_limit'] = max(0, (int) $fields['mailbox_limit']);
        }

        if (array_key_exists('document_root', $fields)) {
            // Empty string = use WebPlate default at daemon config time.
            $updates[] = 'document_root = :document_root';
            $params['document_root'] = WebPlate::normalizeDocumentRoot($fields['document_root'] ?? '');
        }

        if (array_key_exists('waf_enabled', $fields)) {
            $updates[] = 'waf_enabled = :waf_enabled';
            $params['waf_enabled'] = !empty($fields['waf_enabled']) ? 1 : 0;
        }

        if (array_key_exists('waf_deny_ips', $fields)) {
            $updates[] = 'waf_deny_ips = :waf_deny_ips';
            $params['waf_deny_ips'] = self::encodeDenyIps($fields['waf_deny_ips']);
        }

        if (array_key_exists('waf_deny_paths', $fields)) {
            $updates[] = 'waf_deny_paths = :waf_deny_paths';
            $params['waf_deny_paths'] = self::encodeDenyPaths($fields['waf_deny_paths']);
        }

        if (array_key_exists('cpu_limit', $fields) && is_numeric($fields['cpu_limit'])) {
            $updates[] = 'cpu_limit = :cpu_limit';
            $params['cpu_limit'] = max(0, (float) $fields['cpu_limit']);
        }

        if (array_key_exists('memory_limit', $fields) && is_numeric($fields['memory_limit'])) {
            $updates[] = 'memory_limit = :memory_limit';
            $params['memory_limit'] = max(0, (int) $fields['memory_limit']);
        }

        if (array_key_exists('bandwidth_limit_gb', $fields)) {
            if ($fields['bandwidth_limit_gb'] === null || $fields['bandwidth_limit_gb'] === '') {
                $updates[] = 'bandwidth_limit_gb = NULL';
            } else {
                $updates[] = 'bandwidth_limit_gb = :bandwidth_limit_gb';
                $params['bandwidth_limit_gb'] = max(0, (int) $fields['bandwidth_limit_gb']);
            }
        }

        if (array_key_exists('backend_host', $fields)) {
            $updates[] = 'backend_host = :backend_host';
            $params['backend_host'] = trim((string) $fields['backend_host']);
        }

        if ($updates === []) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(', ', $updates) . ' WHERE uuid = :uuid';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($params);
    }

    /** @return array<string, mixed>|null */
    public static function getByUuidShort(string $uuidShort): ?array
    {
        $uuidShort = strtolower(trim($uuidShort));
        if (!preg_match('/^[a-f0-9]{8}$/', $uuidShort)) {
            return null;
        }

        return self::fetchOne('w.uuidShort = :s', ['s' => $uuidShort]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function listByOwnerId(int $ownerId): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT w.*, n.name AS web_node_name, p.name AS webplate_name, p.runtime AS webplate_runtime
            FROM ' . self::$table . ' w
            LEFT JOIN featherpanel_web_nodes n ON n.id = w.web_node_id
            LEFT JOIN featherpanel_webplates p ON p.id = w.webplate_id
            WHERE w.owner_id = :owner
            ORDER BY w.id DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['owner' => $ownerId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        return array_map([self::class, 'hydrate'], $rows);
    }

    public static function countByOwnerId(int $ownerId): int
    {
        if ($ownerId <= 0) {
            return 0;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE owner_id = :owner');
        $stmt->execute(['owner' => $ownerId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * @param list<int> $ids
     *
     * @return list<array<string, mixed>>
     */
    public static function listByIds(array $ids): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids), static fn (int $id): bool => $id > 0)));
        if ($ids === []) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $placeholders = [];
        $params = [];
        foreach ($ids as $i => $id) {
            $key = 'id' . $i;
            $placeholders[] = ':' . $key;
            $params[$key] = $id;
        }

        $sql = 'SELECT w.*, n.name AS web_node_name, p.name AS webplate_name, p.runtime AS webplate_runtime
            FROM ' . self::$table . ' w
            LEFT JOIN featherpanel_web_nodes n ON n.id = w.web_node_id
            LEFT JOIN featherpanel_webplates p ON p.id = w.webplate_id
            WHERE w.id IN (' . implode(', ', $placeholders) . ')
            ORDER BY w.id DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        return array_map([self::class, 'hydrate'], $rows);
    }

    public static function deleteByUuid(string $uuid): bool
    {
        if (!self::isValidUuid($uuid)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE uuid = :uuid');

        return $stmt->execute(['uuid' => $uuid]);
    }

    /**
     * Daemon-facing config payload (pulled by FeatherQuilld).
     *
     * @param array<string, mixed> $row hydrated webspace
     *
     * @return array<string, mixed>
     */
    public static function toDaemonConfig(array $row): array
    {
        $plateId = (int) ($row['webplate_id'] ?? 0);
        $plate = $plateId > 0 ? WebPlate::getById($plateId) : null;
        $plateRef = $plate ? WebPlate::toDaemonRef($plate) : [
            'id' => '',
            'name' => null,
            'runtime' => 'static',
        ];

        $documentRoot = WebPlate::normalizeDocumentRoot($row['document_root'] ?? '');
        if ($documentRoot === '' && $plate) {
            $documentRoot = WebPlate::normalizeDocumentRoot($plate['document_root'] ?? '');
        }

        return [
            'uuid' => (string) $row['uuid'],
            'name' => (string) $row['name'],
            'webplate' => $plateRef,
            'build' => [
                'disk_space' => (int) ($row['disk'] ?? 1024),
                'cpu_limit' => (float) ($row['cpu_limit'] ?? 0),
                'memory_limit' => (int) ($row['memory_limit'] ?? 0),
                'bandwidth_limit_gb' => self::resolveBandwidthLimitGb($row),
            ],
            'domains' => is_array($row['domains'] ?? null) ? array_values($row['domains']) : [],
            'domain_routes' => is_array($row['domain_routes'] ?? null) ? array_values($row['domain_routes']) : [],
            'ssl' => !empty($row['ssl']),
            'ssl_mode' => trim((string) ($row['ssl_mode'] ?? 'acme')) ?: 'acme',
            'acme_email' => trim((string) ($row['owner_email'] ?? '')),
            'waf_enabled' => !empty($row['waf_enabled']),
            'waf_deny_ips' => is_array($row['waf_deny_ips'] ?? null) ? array_values($row['waf_deny_ips']) : [],
            'waf_deny_paths' => is_array($row['waf_deny_paths'] ?? null) ? array_values($row['waf_deny_paths']) : [],
            'backend_port' => (int) ($row['backend_port'] ?? 0),
            'backend_host' => trim((string) ($row['backend_host'] ?? '')),
            'suspended' => strtolower(trim((string) ($row['status'] ?? ''))) === 'suspended',
            'meta' => [
                'document_root' => $documentRoot,
            ],
            'schedules' => WebSpaceSchedule::getActiveByWebspaceId((int) ($row['id'] ?? 0)),
        ];
    }

    /**
     * Install script payload from linked WebPlate.
     *
     * @param array<string, mixed> $row
     *
     * @return array{container_image: string, entrypoint: string, script: string}|null
     */
    public static function toInstallConfig(array $row): ?array
    {
        $plateId = (int) ($row['webplate_id'] ?? 0);
        if ($plateId <= 0) {
            return null;
        }

        $plate = WebPlate::getById($plateId);
        if (!$plate) {
            return null;
        }

        $install = WebPlate::toInstallConfig($plate);

        // Optional per-WebSpace image override (runtime), not install container.
        if (!empty($row['image']) && empty($install['script'])) {
            // keep install container from plate; image on row is for future runtime start
        }

        return $install;
    }

    /**
     * Single-row fetch with owner email joined for ACME / daemon config.
     *
     * @param array<string, mixed> $params
     *
     * @return array<string, mixed>|null
     */
    private static function fetchOne(string $where, array $params): ?array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT w.*, u.username AS owner_username, u.uuid AS owner_uuid, u.email AS owner_email
            FROM ' . self::$table . ' w
            LEFT JOIN featherpanel_users u ON u.id = w.owner_id
            WHERE ' . $where . ' LIMIT 1';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        return $row ? self::hydrate($row) : null;
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    private static function hydrate(array $row): array
    {
        $row['ssl'] = !empty($row['ssl']);
        $row['waf_enabled'] = !empty($row['waf_enabled']);
        $row['waf_deny_ips'] = self::decodeDenyIps($row['waf_deny_ips'] ?? null);
        $row['waf_deny_paths'] = self::decodeDenyPaths($row['waf_deny_paths'] ?? null);
        $row['cpu_limit'] = (float) ($row['cpu_limit'] ?? 0);
        $row['memory_limit'] = (int) ($row['memory_limit'] ?? 0);
        $row['bandwidth_used_bytes'] = (int) ($row['bandwidth_used_bytes'] ?? 0);
        $row['effective_bandwidth_limit_gb'] = self::resolveBandwidthLimitGb($row);
        $row['disk'] = (int) ($row['disk'] ?? 0);
        $row['backend_port'] = (int) ($row['backend_port'] ?? 0);
        $row['web_node_id'] = (int) ($row['web_node_id'] ?? 0);
        $row['webplate_id'] = (int) ($row['webplate_id'] ?? 0);
        $row['domains'] = self::decodeDomains($row['domains'] ?? null);
        $row['ssl_mode'] = trim((string) ($row['ssl_mode'] ?? 'acme')) ?: 'acme';
        $webspaceId = (int) ($row['id'] ?? 0);
        if ($webspaceId > 0) {
            WebSpaceDomain::migrateLegacyFromJson($webspaceId, $row['domains']);
            $row['domain_routes'] = WebSpaceDomain::listForWebspaceId($webspaceId);
        } else {
            $row['domain_routes'] = [];
        }
        $row['state'] = trim((string) ($row['state'] ?? 'stopped')) ?: 'stopped';

        if (isset($row['webplate_name'])) {
            $row['webplate_name'] = $row['webplate_name'] !== null ? (string) $row['webplate_name'] : null;
        }
        if (isset($row['webplate_runtime'])) {
            $row['webplate_runtime'] = $row['webplate_runtime'] !== null ? (string) $row['webplate_runtime'] : null;
        }
        if (isset($row['web_node_name'])) {
            $row['web_node_name'] = $row['web_node_name'] !== null ? (string) $row['web_node_name'] : null;
        }
        if (array_key_exists('owner_username', $row)) {
            $row['owner_username'] = $row['owner_username'] !== null ? (string) $row['owner_username'] : null;
        }
        if (array_key_exists('owner_uuid', $row)) {
            $row['owner_uuid'] = $row['owner_uuid'] !== null ? (string) $row['owner_uuid'] : null;
        }
        if (array_key_exists('owner_email', $row)) {
            $row['owner_email'] = $row['owner_email'] !== null ? (string) $row['owner_email'] : null;
        }

        return $row;
    }

    private static function encodeDomains(mixed $domains): string
    {
        if (is_string($domains)) {
            $decoded = json_decode($domains, true);
            if (is_array($decoded)) {
                $domains = $decoded;
            } else {
                $domains = array_filter(array_map('trim', explode(',', $domains)));
            }
        }

        if (!is_array($domains)) {
            $domains = [];
        }

        $clean = [];
        foreach ($domains as $d) {
            if (!is_string($d) || trim($d) === '') {
                continue;
            }
            $clean[] = strtolower(rtrim(trim($d), '.'));
        }

        return json_encode(array_values(array_unique($clean))) ?: '[]';
    }

    /**
     * @return list<string>
     */
    private static function decodeDomains(mixed $raw): array
    {
        if (is_array($raw)) {
            return array_values(array_filter(array_map('strval', $raw)));
        }

        if (!is_string($raw) || $raw === '') {
            return [];
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? array_values(array_filter(array_map('strval', $decoded))) : [];
    }

    private static function encodeDenyIps(mixed $raw): string
    {
        return json_encode(self::decodeDenyIps($raw)) ?: '[]';
    }

    /**
     * @return list<string>
     */
    private static function decodeDenyIps(mixed $raw): array
    {
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $raw = $decoded;
            } else {
                $parts = preg_split('/[\s,]+/', $raw);
                $raw = $parts === false ? [] : $parts;
            }
        }
        if (!is_array($raw)) {
            return [];
        }

        $out = [];
        foreach ($raw as $item) {
            $value = trim((string) $item);
            if ($value === '' || strlen($value) > 64) {
                continue;
            }
            $host = explode('/', $value, 2)[0];
            if (filter_var($host, FILTER_VALIDATE_IP) === false) {
                continue;
            }
            if (!in_array($value, $out, true)) {
                $out[] = $value;
            }
        }

        return $out;
    }

    private static function encodeDenyPaths(mixed $raw): string
    {
        return json_encode(self::decodeDenyPaths($raw)) ?: '[]';
    }

    /**
     * @return list<string>
     */
    private static function decodeDenyPaths(mixed $raw): array
    {
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $raw = $decoded;
            } else {
                $parts = preg_split('/[\s,]+/', $raw);
                $raw = $parts === false ? [] : $parts;
            }
        }
        if (!is_array($raw)) {
            return [];
        }

        $out = [];
        foreach ($raw as $item) {
            $value = str_replace('\\', '/', trim((string) $item));
            if ($value === '' || strlen($value) > 256) {
                continue;
            }
            if (!str_starts_with($value, '/')) {
                $value = '/' . $value;
            }
            if (str_contains($value, '..') || str_contains($value, "\0")) {
                continue;
            }
            if (str_starts_with(strtolower($value), '/.well-known')) {
                continue;
            }
            while (str_contains($value, '//')) {
                $value = str_replace('//', '/', $value);
            }
            if ($value === '/') {
                continue;
            }
            if (!in_array($value, $out, true)) {
                $out[] = $value;
            }
        }

        return $out;
    }

    private static function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0F) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3F) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
