<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Chat;

use App\App;

/**
 * Server service/model for CRUD operations on the featherpanel_servers table.
 */
class Server
{
    /**
     * @var string The servers table name
     */
    private static string $table = 'featherpanel_servers';

    /**
     * Create a new server.
     *
     * @param array $data Associative array of server fields (must include required fields)
     *
     * @return int|false The new server's ID or false on failure
     */
    public static function createServer(array $data): int|false
    {
        // Required fields for server creation
        $required = [
            'uuid',
            'uuidShort',
            'node_id',
            'name',
            'description',
            'owner_id',
            'memory',
            'swap',
            'disk',
            'io',
            'cpu',
            'allocation_id',
            'realms_id',
            'spell_id',
            'startup',
            'image',
        ];

        $columns = self::getColumns();
        $columns = array_map(fn ($c) => $c['Field'], $columns);
        $missing = array_diff($required, $columns);
        if (!empty($missing)) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Missing required fields: ' . implode(', ', $missing) . ' for server: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $sanitizedData = self::sanitizeDataForLogging($data);
                App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for server: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                return false;
            }

            // Special validation for different field types
            if (in_array($field, ['node_id', 'owner_id', 'memory', 'disk', 'io', 'cpu', 'allocation_id', 'realms_id', 'spell_id'])) {
                if (!is_numeric($data[$field]) || (int) $data[$field] <= 0) {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Invalid ' . $field . ': ' . $data[$field] . ' for server: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            } elseif ($field === 'swap') {
                // Swap can be 0 or positive
                if (!is_numeric($data[$field]) || (int) $data[$field] < 0) {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Invalid ' . $field . ': ' . $data[$field] . ' for server: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            } else {
                // String fields validation
                if (!is_string($data[$field]) || trim($data[$field]) === '') {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for server: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            }
        }

        // UUID validation (basic)
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $data['uuid'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid UUID: ' . $data['uuid'] . ' for server: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // UUID Short validation (8 characters)
        if (!preg_match('/^[a-f0-9]{8}$/i', $data['uuidShort'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid UUID Short: ' . $data['uuidShort'] . ' for server: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Validate foreign key relationships
        if (!Node::getNodeById($data['node_id'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid node_id: ' . $data['node_id'] . ' for server: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        if (!User::getUserById($data['owner_id'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid owner_id: ' . $data['owner_id'] . ' for server: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        if (!Allocation::getAllocationById($data['allocation_id'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid allocation_id: ' . $data['allocation_id'] . ' for server: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        if (!Realm::getById($data['realms_id'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid realms_id: ' . $data['realms_id'] . ' for server: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        if (!Spell::getSpellById($data['spell_id'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid spell_id: ' . $data['spell_id'] . ' for server: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);
        if ($stmt->execute($data)) {
            return (int) $pdo->lastInsertId();
        }

        return false;
    }

    /**
     * Fetch a server by ID.
     */
    public static function getServerById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Fetch a server by UUID.
     */
    public static function getServerByUuid(string $uuid): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $uuid]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function getServerByUuidAndNodeId(string $uuid, int $nodeId): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid AND node_id = :node_id LIMIT 1');
        $stmt->execute(['uuid' => $uuid, 'node_id' => $nodeId]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Fetch a server by UUID Short.
     */
    public static function getServerByUuidShort(string $uuidShort): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuidShort = :uuidShort LIMIT 1');
        $stmt->execute(['uuidShort' => $uuidShort]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get all servers.
     */
    public static function getAllServers(): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;
        $stmt = $pdo->query($sql);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get servers by owner ID.
     */
    public static function getServersByOwnerId(int $ownerId): array
    {
        if ($ownerId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE owner_id = :owner_id');
        $stmt->execute(['owner_id' => $ownerId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get servers by node ID.
     */
    public static function getServersByNodeId(int $nodeId): array
    {
        if ($nodeId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE node_id = :node_id');
        $stmt->execute(['node_id' => $nodeId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get servers by realm ID.
     */
    public static function getServersByRealmId(int $realmId): array
    {
        if ($realmId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE realms_id = :realms_id');
        $stmt->execute(['realms_id' => $realmId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get servers by spell ID.
     */
    public static function getServersBySpellId(int $spellId): array
    {
        if ($spellId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE spell_id = :spell_id');
        $stmt->execute(['spell_id' => $spellId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get server by allocation ID.
     */
    public static function getServerByAllocationId(int $allocationId): ?array
    {
        if ($allocationId <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE allocation_id = :allocation_id LIMIT 1');
        $stmt->execute(['allocation_id' => $allocationId]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Search servers with pagination, filtering, and field selection.
     *
     * @param int $page Page number (1-based)
     * @param int $limit Number of results per page
     * @param string $search Search term for name/description (optional)
     * @param array $fields Fields to select (e.g. ['name', 'status']) (default: all)
     * @param string $sortBy Field to sort by (default: 'id')
     * @param string $sortOrder 'ASC' or 'DESC' (default: 'ASC')
     * @param int|null $ownerId Filter by owner ID (optional)
     * @param int|null $nodeId Filter by node ID (optional)
     * @param int|null $realmId Filter by realm ID (optional)
     * @param int|null $spellId Filter by spell ID (optional)
     */
    public static function searchServers(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        array $fields = [],
        string $sortBy = 'id',
        string $sortOrder = 'ASC',
        ?int $ownerId = null,
        ?int $nodeId = null,
        ?int $realmId = null,
        ?int $spellId = null,
    ): array {
        $pdo = Database::getPdoConnection();

        if (empty($fields)) {
            $selectFields = '*';
        } else {
            $selectFields = implode(', ', $fields);
        }

        $sql = "SELECT $selectFields FROM " . self::$table;
        $where = [];
        $params = [];

        if (!empty($search)) {
            $where[] = '(name LIKE :search OR description LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($ownerId !== null) {
            $where[] = 'owner_id = :owner_id';
            $params['owner_id'] = $ownerId;
        }

        if ($nodeId !== null) {
            $where[] = 'node_id = :node_id';
            $params['node_id'] = $nodeId;
        }

        if ($realmId !== null) {
            $where[] = 'realms_id = :realms_id';
            $params['realms_id'] = $realmId;
        }

        if ($spellId !== null) {
            $where[] = 'spell_id = :spell_id';
            $params['spell_id'] = $spellId;
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= " ORDER BY $sortBy $sortOrder";
        $offset = max(0, ($page - 1) * $limit);
        $sql .= ' LIMIT :limit OFFSET :offset';

        $stmt = $pdo->prepare($sql);

        // Bind parameters
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value, \PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', (int) $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', (int) $offset, \PDO::PARAM_INT);

        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Update a server by UUID.
     */
    public static function updateServer(string $uuid, array $data): bool
    {
        try {
            if (empty($data)) {
                App::getInstance(true)->getLogger()->error('No data to update');

                return false;
            }
            // Prevent updating primary key/id
            if (isset($data['uuid'])) {
                unset($data['uuid']);
            }
            if (isset($data['id'])) {
                unset($data['id']);
            }
            $columns = self::getColumns();
            $columns = array_map(fn ($c) => $c['Field'], $columns);
            $missing = array_diff(array_keys($data), $columns);
            if (!empty($missing)) {
                App::getInstance(true)->getLogger()->error('Missing fields: ' . implode(', ', $missing));

                return false;
            }
            $pdo = Database::getPdoConnection();
            $fields = array_keys($data);
            if (empty($fields)) {
                App::getInstance(true)->getLogger()->error('No fields to update');

                return false;
            }
            $set = implode(', ', array_map(fn ($f) => "$f = :$f", $fields));
            $sql = 'UPDATE ' . self::$table . ' SET ' . $set . ' WHERE uuid = :uuid';
            $stmt = $pdo->prepare($sql);
            $data['uuid'] = $uuid;

            return $stmt->execute($data);
        } catch (\PDOException $e) {
            error_log($e->getMessage());
            App::getInstance(true)->getLogger()->error('Failed to update server: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Update a server by ID.
     */
    public static function updateServerById(int $id, array $data): bool
    {
        try {
            if ($id <= 0) {
                return false;
            }
            if (empty($data)) {
                App::getInstance(true)->getLogger()->error('No data to update');

                return false;
            }
            // Prevent updating primary key/id
            if (isset($data['id'])) {
                unset($data['id']);
            }
            $columns = self::getColumns();
            $columns = array_map(fn ($c) => $c['Field'], $columns);
            $missing = array_diff(array_keys($data), $columns);
            if (!empty($missing)) {
                App::getInstance(true)->getLogger()->error('Missing fields: ' . implode(', ', $missing));

                return false;
            }
            $pdo = Database::getPdoConnection();
            $fields = array_keys($data);
            if (empty($fields)) {
                App::getInstance(true)->getLogger()->error('No fields to update');

                return false;
            }
            $set = implode(', ', array_map(fn ($f) => "$f = :$f", $fields));
            $sql = 'UPDATE ' . self::$table . ' SET ' . $set . ' WHERE id = :id';
            $stmt = $pdo->prepare($sql);
            $data['id'] = $id;

            return $stmt->execute($data);
        } catch (\PDOException $e) {
            error_log($e->getMessage());
            App::getInstance(true)->getLogger()->error('Failed to update server: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Hard-delete a server.
     */
    public static function hardDeleteServer(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'DELETE FROM ' . self::$table . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Get server with related data (owner, node, realm, spell).
     */
    public static function getServerWithRelations(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT s.*, 
                       u.username as owner_username, u.email as owner_email,
                       n.name as node_name, n.location_id as node_location_id,
                       r.name as realm_name, r.description as realm_description,
                       sp.name as spell_name, sp.description as spell_description
                FROM ' . self::$table . ' s
                LEFT JOIN featherpanel_users u ON s.owner_id = u.id
                LEFT JOIN featherpanel_nodes n ON s.node_id = n.id
                LEFT JOIN featherpanel_realms r ON s.realms_id = r.id
                LEFT JOIN featherpanel_spells sp ON s.spell_id = sp.id
                WHERE s.id = :id LIMIT 1';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get all servers with related data.
     */
    public static function getAllServersWithRelations(): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT s.*, 
                       u.username as owner_username, u.email as owner_email,
                       n.name as node_name, n.location_id as node_location_id,
                       r.name as realm_name, r.description as realm_description,
                       sp.name as spell_name, sp.description as spell_description
                FROM ' . self::$table . ' s
                LEFT JOIN featherpanel_users u ON s.owner_id = u.id
                LEFT JOIN featherpanel_nodes n ON s.node_id = n.id
                LEFT JOIN featherpanel_realms r ON s.realms_id = r.id
                LEFT JOIN featherpanel_spells sp ON s.spell_id = sp.id';
        $stmt = $pdo->query($sql);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get the total number of servers.
     */
    public static function getCount(
        string $search = '',
        ?int $ownerId = null,
        ?int $nodeId = null,
        ?int $realmId = null,
        ?int $spellId = null,
    ): int {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table;
        $where = [];
        $params = [];

        if ($search !== '') {
            $where[] = '(name LIKE :search OR description LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($ownerId !== null) {
            $where[] = 'owner_id = :owner_id';
            $params['owner_id'] = $ownerId;
        }

        if ($nodeId !== null) {
            $where[] = 'node_id = :node_id';
            $params['node_id'] = $nodeId;
        }

        if ($realmId !== null) {
            $where[] = 'realms_id = :realms_id';
            $params['realms_id'] = $realmId;
        }

        if ($spellId !== null) {
            $where[] = 'spell_id = :spell_id';
            $params['spell_id'] = $spellId;
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $stmt = $pdo->prepare($sql);
        if (!empty($params)) {
            $stmt->execute($params);
        } else {
            $stmt->execute();
        }

        return (int) $stmt->fetchColumn();
    }

    /**
     * Get table columns.
     */
    public static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SHOW COLUMNS FROM ' . self::$table);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Generate a UUID for a new server.
     */
    public static function generateUuid(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xFFFF),
            mt_rand(0, 0xFFFF),
            mt_rand(0, 0xFFFF),
            mt_rand(0, 0x0FFF) | 0x4000,
            mt_rand(0, 0x3FFF) | 0x8000,
            mt_rand(0, 0xFFFF),
            mt_rand(0, 0xFFFF),
            mt_rand(0, 0xFFFF)
        );
    }

    /**
     * Generate a UUID Short for a new server.
     */
    public static function generateUuidShort(): string
    {
        return sprintf('%08x', mt_rand(0, 0xFFFFFFFF));
    }

    /**
     * Reset all server statuses to null.
     *
     * @return bool True if successful, false otherwise
     */
    public static function resetAllServerStatuses(int $nodeId): bool
    {
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET `status` = NULL WHERE node_id = :node_id');
            $stmt->bindValue(':node_id', $nodeId, \PDO::PARAM_INT);

            return $stmt->execute();
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to reset server statuses: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Update a server's status.
     *
     * @param int $serverId The server ID
     * @param string|null $status The new status
     *
     * @return bool True if successful, false otherwise
     */
    public static function updateServerStatus(int $serverId, ?string $status): bool
    {
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET `status` = :status WHERE id = :server_id');
            $stmt->bindValue(':status', $status, \PDO::PARAM_STR);
            $stmt->bindValue(':server_id', $serverId, \PDO::PARAM_INT);

            return $stmt->execute();
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to update server status: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Update a server's installation status and timestamp.
     *
     * @param int $serverId The server ID
     * @param string $status The new status
     * @param \DateTimeImmutable|null $installedAt The installation timestamp (optional)
     *
     * @return bool True if successful, false otherwise
     */
    public static function updateServerInstallationStatus(int $serverId, string $status, ?\DateTimeImmutable $installedAt = null): bool
    {
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET `status` = :status, `installed_at` = :installed_at WHERE id = :server_id');
            $stmt->bindValue(':status', $status, \PDO::PARAM_STR);

            // Use provided timestamp or current time
            $timestamp = $installedAt ? $installedAt->format('Y-m-d H:i:s') : date('Y-m-d H:i:s');
            $stmt->bindValue(':installed_at', $timestamp, \PDO::PARAM_STR);
            $stmt->bindValue(':server_id', $serverId, \PDO::PARAM_INT);

            return $stmt->execute();
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to update server installation status: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Sanitize data for logging (remove sensitive fields).
     */
    private static function sanitizeDataForLogging(array $data): array
    {
        $sensitiveFields = ['password', 'remember_token', 'two_fa_key'];
        $sanitized = $data;

        foreach ($sensitiveFields as $field) {
            if (isset($sanitized[$field])) {
                $sanitized[$field] = '[REDACTED]';
            }
        }

        return $sanitized;
    }
}
