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
use App\Helpers\AvatarHelper;
use App\Config\ConfigInterface;

/**
 * User service/model for CRUD operations on the featherpanel_users table.
 */
class User
{
    /**
     * @var string The users table name
     */
    private static string $table = 'featherpanel_users';

    /**
     * Create a new user.
     *
     * @param array $data Associative array of user fields (must include required fields)
     *
     * @return int|false The new user's ID or false on failure
     */
    public static function createUser(array $data, bool $skipEmailValidation = false): int | false
    {
        // Required fields for user creation
        $required = [
            'username',
            'first_name',
            'last_name',
            'email',
            'password',
            'uuid',
        ];

        $columns = self::getColumns();
        $columns = array_map(fn ($c) => $c['Field'], $columns);
        $missing = array_diff($required, $columns);
        if (!empty($missing)) {
            return false;
        }

        foreach ($required as $field) {
            if (!isset($data[$field]) || !is_string($data[$field]) || trim($data[$field]) === '') {
                return false;
            }
        }
        if ($skipEmailValidation) {
            // Email validation
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                return false;
            }
        }
        // UUID validation (basic)
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $data['uuid'])) {
            return false;
        }

        // Build explicit fields and insert arrays (same pattern as Location.php)
        $fields = ['username', 'first_name', 'last_name', 'email', 'password', 'uuid'];
        $insert = [];
        foreach ($fields as $field) {
            $insert[$field] = $data[$field] ?? null;
        }

        // remember_token has no DB default always generate one if not supplied
        $fields[] = 'remember_token';
        $insert['remember_token'] = $data['remember_token'] ?? self::generateAccountToken();

        // Add optional fields if provided
        $optionalFields = [
            'role_id',
            'avatar',
            'first_ip',
            'last_ip',
            'banned',
            'two_fa_enabled',
            'two_fa_key',
            'external_id',
            'ticket_signature',
            'oidc_provider',
            'oidc_subject',
            'oidc_email',
            'ldap_provider_uuid',
            'ldap_dn',
            'mail_verify',
        ];
        foreach ($optionalFields as $field) {
            if (isset($data[$field])) {
                $insert[$field] = $data[$field];
                $fields[] = $field;
            }
        }

        // Handle optional ID for migrations (EXACT same pattern as Location.php)
        // NOTE: ID 1 is reserved for the main user and should be skipped
        $hasId = false;
        if (isset($data['id'])) {
            // Accept both int and numeric string IDs
            if (is_int($data['id']) || (is_string($data['id']) && ctype_digit((string) $data['id']))) {
                $idValue = (int) $data['id'];
                // Skip ID 1 (reserved for main user)
                if ($idValue > 1 && $idValue > 0) {
                    $insert['id'] = $idValue;
                    $fields[] = 'id';
                    $hasId = true;
                }
            }
        }

        $pdo = Database::getPdoConnection();
        $fieldList = '`' . implode('`, `', $fields) . '`';
        $placeholders = ':' . implode(', :', $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . $fieldList . ') VALUES (' . $placeholders . ')';
        $stmt = $pdo->prepare($sql);
        if ($stmt->execute($insert)) {
            return $hasId ? $insert['id'] : (int) $pdo->lastInsertId();
        }

        return false;
    }

    /**
     * Fetch a user by ID.
     */
    public static function getUserById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return AvatarHelper::enrichUser($stmt->fetch(\PDO::FETCH_ASSOC) ?: null);
    }

    /**
     * Fetch a user by email.
     */
    public static function getUserByEmail(string $email): ?array
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);

        return AvatarHelper::enrichUser($stmt->fetch(\PDO::FETCH_ASSOC) ?: null);
    }

    /**
     * Get all users (optionally including deleted).
     */
    public static function getAllUsers(bool $includeDeleted = false): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;
        if (!$includeDeleted) {
            $sql .= " WHERE deleted = 'false'";
        }
        $stmt = $pdo->query($sql);

        return AvatarHelper::enrichUsers($stmt->fetchAll(\PDO::FETCH_ASSOC));
    }

    /**
     * Get active (non-deleted, non-banned) users for the given role IDs.
     *
     * @param int[] $roleIds
     *
     * @return array<int, array>
     */
    public static function getActiveUsersByRoleIds(array $roleIds): array
    {
        $roleIds = array_values(array_filter(array_map(static fn ($id) => (int) $id, $roleIds), static fn (int $id) => $id > 0));
        if ($roleIds === []) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $placeholders = implode(',', array_fill(0, count($roleIds), '?'));
        $sql = 'SELECT uuid, email, first_name, last_name, username, role_id FROM ' . self::$table
            . " WHERE role_id IN ($placeholders) AND deleted = 'false' AND banned = 'false'";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($roleIds);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Search users with pagination, filtering, and field selection.
     *
     * @param int $page Page number (1-based)
     * @param int $limit Number of results per page
     * @param string $search Search term for username/email (optional)
     * @param bool $includeDeleted Include deleted users (default: false)
     * @param array $fields Fields to select (e.g. ['username', 'email']) (default: all)
     * @param string $sortBy Field to sort by (default: 'id')
     * @param string $sortOrder 'ASC' or 'DESC' (default: 'ASC')
     */
    public static function searchUsers(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        bool $includeDeleted = false,
        array $fields = [],
        string $sortBy = 'id',
        string $sortOrder = 'ASC',
        ?int $roleId = null,
        ?bool $banned = null,
        ?int $userId = null,
        ?string $uuid = null,
        ?string $externalId = null,
        ?string $ip = null,
        ?bool $emailVerified = null,
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

        if (!$includeDeleted) {
            $where[] = "deleted = 'false'";
        }

        if (!empty($search)) {
            $where[] =
                '(username LIKE :search OR email LIKE :search OR first_name LIKE :search OR last_name LIKE :search OR uuid LIKE :search OR external_id LIKE :search OR CAST(id AS CHAR) LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($roleId !== null) {
            $where[] = 'role_id = :role_id';
            $params['role_id'] = $roleId;
        }

        if ($banned !== null) {
            $where[] = 'banned = :banned';
            $params['banned'] = $banned ? 'true' : 'false';
        }

        if ($userId !== null) {
            $where[] = 'id = :user_id';
            $params['user_id'] = $userId;
        }

        if ($uuid !== null && $uuid !== '') {
            $where[] = 'uuid = :uuid';
            $params['uuid'] = $uuid;
        }

        if ($externalId !== null && $externalId !== '') {
            $where[] = 'external_id = :external_id';
            $params['external_id'] = $externalId;
        }

        if ($ip !== null && $ip !== '') {
            $where[] = '(last_ip LIKE :ip OR first_ip LIKE :ip)';
            $params['ip'] = '%' . $ip . '%';
        }

        if ($emailVerified === true) {
            $where[] = "(mail_verify IS NULL OR mail_verify = '')";
        } elseif ($emailVerified === false) {
            $where[] = "(mail_verify IS NOT NULL AND mail_verify != '')";
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

        return AvatarHelper::enrichUsers($stmt->fetchAll(\PDO::FETCH_ASSOC));
    }

    /**
     * Update a user by ID.
     */
    public static function updateUser(string $uuid, array $data): bool
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
                App::getInstance(true)->getLogger()->error('Invalid fields: ' . implode(', ', $missing));

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
            App::getInstance(true)->getLogger()->error('Failed to update user: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Soft-delete a user (mark as deleted).
     */
    public static function softDeleteUser(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'UPDATE ' . self::$table . " SET deleted = 'true' WHERE id = :id";
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Hard-delete a user (permanently remove).
     */
    public static function hardDeleteUser(int $id): bool
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
     * Restore a soft-deleted user.
     */
    public static function restoreUser(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'UPDATE ' . self::$table . " SET deleted = 'false' WHERE id = :id";
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Get a user by its username.
     */
    public static function getUserByUsername(string $username): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE username = :username LIMIT 1');
        $stmt->execute(['username' => $username]);

        return AvatarHelper::enrichUser($stmt->fetch(\PDO::FETCH_ASSOC) ?: null);
    }

    /**
     * Get a user by its uuid.
     */
    public static function getUserByUuid(string $uuid): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $uuid]);

        return AvatarHelper::enrichUser($stmt->fetch(\PDO::FETCH_ASSOC) ?: null);
    }

    /**
     * Get a user by its mail verify.
     */
    public static function getUserByMailVerify(string $mailVerify): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE mail_verify = :mail_verify LIMIT 1');
        $stmt->execute(['mail_verify' => $mailVerify]);

        return AvatarHelper::enrichUser($stmt->fetch(\PDO::FETCH_ASSOC) ?: null);
    }

    public static function getUserByExternalId(string $externalId): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE external_id = :external_id LIMIT 1');
        $stmt->execute(['external_id' => $externalId]);

        return AvatarHelper::enrichUser($stmt->fetch(\PDO::FETCH_ASSOC) ?: null);
    }

    /**
     * Get a user by LDAP provider UUID and DN.
     */
    public static function getUserByLdapProviderAndDn(string $providerUuid, string $dn): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE ldap_provider_uuid = :provider_uuid AND ldap_dn = :dn LIMIT 1');
        $stmt->execute(['provider_uuid' => $providerUuid, 'dn' => $dn]);

        return AvatarHelper::enrichUser($stmt->fetch(\PDO::FETCH_ASSOC) ?: null);
    }

    /**
     * Get a user by its remember token.
     */
    public static function getUserByRememberToken(string $rememberToken): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE remember_token = :remember_token LIMIT 1');
        $stmt->execute(['remember_token' => $rememberToken]);

        return AvatarHelper::enrichUser($stmt->fetch(\PDO::FETCH_ASSOC) ?: null);
    }

    public static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SHOW COLUMNS FROM ' . self::$table);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get the total number of users.
     */
    public static function getCount(
        string $search = '',
        ?int $roleId = null,
        ?bool $banned = null,
        ?int $userId = null,
        ?string $uuid = null,
        ?string $externalId = null,
        ?string $ip = null,
        ?bool $emailVerified = null,
    ): int {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table;
        $where = [];
        $params = [];

        if ($search !== '') {
            $where[] =
                '(username LIKE :search OR email LIKE :search OR first_name LIKE :search OR last_name LIKE :search OR uuid LIKE :search OR external_id LIKE :search OR CAST(id AS CHAR) LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($roleId !== null) {
            $where[] = 'role_id = :role_id';
            $params['role_id'] = $roleId;
        }

        if ($banned !== null) {
            $where[] = 'banned = :banned';
            $params['banned'] = $banned ? 'true' : 'false';
        }

        if ($userId !== null) {
            $where[] = 'id = :user_id';
            $params['user_id'] = $userId;
        }

        if ($uuid !== null && $uuid !== '') {
            $where[] = 'uuid = :uuid';
            $params['uuid'] = $uuid;
        }

        if ($externalId !== null && $externalId !== '') {
            $where[] = 'external_id = :external_id';
            $params['external_id'] = $externalId;
        }

        if ($ip !== null && $ip !== '') {
            $where[] = '(last_ip LIKE :ip OR first_ip LIKE :ip)';
            $params['ip'] = '%' . $ip . '%';
        }

        if ($emailVerified === true) {
            $where[] = "(mail_verify IS NULL OR mail_verify = '')";
        } elseif ($emailVerified === false) {
            $where[] = "(mail_verify IS NOT NULL AND mail_verify != '')";
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
     * Return a non-empty remember token for the user, generating and persisting one if missing.
     *
     * @param mixed $currentRememberToken Value from user row (may be null or absent)
     *
     * @return string|false The token, or false if the database update failed
     */
    public static function ensureRememberToken(string $uuid, mixed $currentRememberToken): string | false
    {
        $token = is_string($currentRememberToken) ? trim($currentRememberToken) : '';
        if ($token !== '') {
            return $token;
        }
        $token = self::generateAccountToken();
        if (!self::updateUser($uuid, ['remember_token' => $token])) {
            return false;
        }

        return $token;
    }

    /**
     * Generate a random account token.
     */
    public static function generateAccountToken(): string
    {
        $appName = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_NAME, 'featherpanel');
        $tokenID = strtolower($appName) . '_authtoken_' . bin2hex(random_bytes(16));

        return $tokenID;
    }

    /**
     * Generate a cryptographically secure version 4 UUID.
     */
    public static function generateUuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr(ord($bytes[6]) & 0x0F | 0x40);
        $bytes[8] = chr(ord($bytes[8]) & 0x3F | 0x80);
        $hex = bin2hex($bytes);

        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($hex, 0, 8),
            substr($hex, 8, 4),
            substr($hex, 12, 4),
            substr($hex, 16, 4),
            substr($hex, 20, 12)
        );
    }

    /**
     * Find other users that may be alts by comparing IP addresses from panel activity,
     * server activity, first/last IP fields, and browser/device sync identifiers.
     *
     * @return array{
     *     source_ips: string[],
     *     source_devices: string[],
     *     potential_alts: array<int, array<string, mixed>>
     * }
     */
    public static function findPotentialAltsByUuid(string $userUuid): array
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
            return ['source_ips' => [], 'source_devices' => [], 'potential_alts' => []];
        }

        $user = self::getUserByUuid($userUuid);
        if (!$user) {
            return ['source_ips' => [], 'source_devices' => [], 'potential_alts' => []];
        }

        $ignoredIps = ['127.0.0.1', '::1', '0.0.0.0', ''];
        $sourceIps = Activity::getDistinctIpsByUserUuid($userUuid);
        $sourceIps = array_merge($sourceIps, ServerActivity::getDistinctIpsByUserId((int) $user['id']));

        foreach (['first_ip', 'last_ip'] as $field) {
            $ip = trim((string) ($user[$field] ?? ''));
            if ($ip !== '' && !in_array($ip, $ignoredIps, true)) {
                $sourceIps[] = $ip;
            }
        }

        $sourceIps = array_values(array_unique(array_filter(
            $sourceIps,
            static fn ($ip) => is_string($ip)
                && trim($ip) !== ''
                && !in_array(trim($ip), $ignoredIps, true)
        )));

        $sourceDevices = array_values(array_unique(array_merge(
            UserDevice::getDeviceHashesByUserUuid($userUuid),
            UserDevice::getSignalHashesByUserUuid($userUuid),
        )));

        if (empty($sourceIps) && empty($sourceDevices)) {
            return ['source_ips' => [], 'source_devices' => [], 'potential_alts' => []];
        }

        $pdo = Database::getPdoConnection();
        $ipMatches = [];
        if (!empty($sourceIps)) {
            $placeholders = implode(',', array_fill(0, count($sourceIps), '?'));

            $sql = 'SELECT u.uuid, u.username, u.email, u.avatar, u.banned, u.first_ip, u.last_ip, u.last_seen, u.role_id,
                           a.ip_address AS shared_ip, \'panel_activity\' AS match_source
                    FROM featherpanel_activity a
                    INNER JOIN ' . self::$table . ' u ON u.uuid = a.user_uuid
                    WHERE a.ip_address IN (' . $placeholders . ') AND u.uuid != ?';
            $params = array_merge($sourceIps, [$userUuid]);
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $ipMatches = array_merge($ipMatches, $stmt->fetchAll(\PDO::FETCH_ASSOC));

            $sqlServer = 'SELECT u.uuid, u.username, u.email, u.avatar, u.banned, u.first_ip, u.last_ip, u.last_seen, u.role_id,
                                  sa.ip AS shared_ip, \'server_activity\' AS match_source
                           FROM featherpanel_server_activities sa
                           INNER JOIN ' . self::$table . ' u ON u.id = sa.user_id
                           WHERE sa.ip IN (' . $placeholders . ') AND u.uuid != ?';
            $stmtServer = $pdo->prepare($sqlServer);
            $stmtServer->execute($params);
            $ipMatches = array_merge($ipMatches, $stmtServer->fetchAll(\PDO::FETCH_ASSOC));

            $sql2 = 'SELECT uuid, username, email, avatar, banned, first_ip, last_ip, last_seen, role_id,
                            first_ip AS shared_ip, \'user_ip\' AS match_source
                     FROM ' . self::$table . '
                     WHERE uuid != ? AND first_ip IN (' . $placeholders . ')
                     UNION ALL
                     SELECT uuid, username, email, avatar, banned, first_ip, last_ip, last_seen, role_id,
                            last_ip AS shared_ip, \'user_ip\' AS match_source
                     FROM ' . self::$table . '
                     WHERE uuid != ? AND last_ip IN (' . $placeholders . ')';
            $params2 = array_merge([$userUuid], $sourceIps, [$userUuid], $sourceIps);
            $stmt2 = $pdo->prepare($sql2);
            $stmt2->execute($params2);
            $ipMatches = array_merge($ipMatches, $stmt2->fetchAll(\PDO::FETCH_ASSOC));
        }

        $deviceHashes = UserDevice::getDeviceHashesByUserUuid($userUuid);
        $deviceMatches = UserDevice::findUsersByDeviceHashes($deviceHashes, $userUuid);
        foreach ($deviceMatches as &$row) {
            $row['match_source'] = 'device_sync';
        }
        unset($row);

        $signalHashes = UserDevice::getSignalHashesByUserUuid($userUuid);
        $signalMatches = UserDevice::findUsersBySignalHashes($signalHashes, $userUuid);
        foreach ($signalMatches as &$row) {
            $row['match_source'] = 'device_profile';
        }
        unset($row);

        $altsMap = [];
        foreach (array_merge($ipMatches, $deviceMatches, $signalMatches) as $row) {
            $uuid = $row['uuid'];
            if (!isset($altsMap[$uuid])) {
                $altsMap[$uuid] = [
                    'uuid' => $uuid,
                    'username' => $row['username'],
                    'email' => $row['email'],
                    'avatar' => $row['avatar'],
                    'banned' => $row['banned'],
                    'first_ip' => $row['first_ip'],
                    'last_ip' => $row['last_ip'],
                    'last_seen' => $row['last_seen'],
                    'role_id' => $row['role_id'],
                    'shared_ips' => [],
                    'shared_devices' => [],
                    'match_reasons' => [],
                ];
            }

            $matchSource = (string) ($row['match_source'] ?? '');
            if ($matchSource !== '' && !in_array($matchSource, $altsMap[$uuid]['match_reasons'], true)) {
                $altsMap[$uuid]['match_reasons'][] = $matchSource;
            }

            if (isset($row['shared_ip'])) {
                $sharedIp = trim((string) $row['shared_ip']);
                if ($sharedIp !== '' && !in_array($sharedIp, $altsMap[$uuid]['shared_ips'], true)) {
                    $altsMap[$uuid]['shared_ips'][] = $sharedIp;
                }
            }

            if (isset($row['shared_device'])) {
                $sharedDevice = trim((string) $row['shared_device']);
                if ($sharedDevice !== '' && !in_array($sharedDevice, $altsMap[$uuid]['shared_devices'], true)) {
                    $altsMap[$uuid]['shared_devices'][] = $sharedDevice;
                }
            }
        }

        $alts = array_values($altsMap);
        usort($alts, static function (array $a, array $b): int {
            $scoreA = count($a['shared_ips']) + (count($a['shared_devices']) * 2);
            $scoreB = count($b['shared_ips']) + (count($b['shared_devices']) * 2);
            $cmp = $scoreB <=> $scoreA;
            if ($cmp !== 0) {
                return $cmp;
            }

            return strcmp((string) $a['username'], (string) $b['username']);
        });

        foreach ($alts as &$alt) {
            sort($alt['shared_ips']);
            sort($alt['shared_devices']);
            sort($alt['match_reasons']);
            $alt['match_count'] = count($alt['shared_ips']) + count($alt['shared_devices']);
            $alt['confidence'] = in_array('device_sync', $alt['match_reasons'], true)
                && !empty($alt['shared_ips']) ? 'high'
                : (in_array('device_sync', $alt['match_reasons'], true) || in_array('device_profile', $alt['match_reasons'], true) ? 'medium' : 'low');
        }
        unset($alt);

        return [
            'source_ips' => $sourceIps,
            'source_devices' => $sourceDevices,
            'potential_alts' => $alts,
        ];
    }
}
