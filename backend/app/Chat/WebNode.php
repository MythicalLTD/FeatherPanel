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
use App\Cache\Cache;
use App\Helpers\WebNodeCustomHeaders;
use App\Helpers\FeatherQuilldCapabilities;
use App\Helpers\FeatherQuilldConfigBuilder;

/**
 * WebNode service/model for CRUD operations on the featherpanel_web_nodes table.
 *
 * Represents FeatherQuilld (web hosting) daemon nodes that FeatherPanel can talk to.
 */
class WebNode
{
    /**
     * @var string The web nodes table name
     */
    private static string $table = 'featherpanel_web_nodes';

    /**
     * Whitelist of allowed field names for SQL queries to prevent injection.
     *
     * @var array<int, string>
     */
    private static array $allowedFields = [
        'id',
        'uuid',
        'name',
        'description',
        'location_id',
        'fqdn',
        'public',
        'scheme',
        'behind_proxy',
        'proxyEnabled',
        'proxyProvider',
        'acmeEmail',
        'acmeStaging',
        'backendPortMin',
        'backendPortMax',
        'proxyBackendHost',
        'proxyBackendBindHost',
        'maintenance_mode',
        'memory',
        'memory_overallocate',
        'disk',
        'disk_overallocate',
        'upload_size',
        'daemon_token_id',
        'daemon_token',
        'daemonListen',
        'daemonBase',
        'websitesPath',
        'backupsPath',
        'backupsProvider',
        'backupsS3Endpoint',
        'backupsS3Region',
        'backupsS3Bucket',
        'backupsS3AccessKey',
        'backupsS3SecretKey',
        'backupsS3Prefix',
        'backupsS3ForcePathStyle',
        'backupsResticRepository',
        'backupsResticPassword',
        'backupsResticBinary',
        'backupsPbsRepository',
        'backupsPbsPassword',
        'backupsPbsFingerprint',
        'backupsPbsBinary',
        'addonsPath',
        'quilldConfigOverrides',
        'remoteTimeout',
        'remoteRetryLimit',
        'remoteCustomHeaders',
        'sftpEnabled',
        'sftpKeyAlgorithm',
        'sftpPort',
        'sftpDisablePasswordAuth',
        'ftpEnabled',
        'ftpPort',
        'ftpPassivePortMin',
        'ftpPassivePortMax',
    ];

    /**
     * Validate required fields and types for web node creation/update.
     *
     * @param array<string, mixed> $data
     * @param array<int, string> $requiredFields
     *
     * @return array<int, string> Validation error messages (empty if ok)
     */
    public static function validateWebNodeData(array $data, array $requiredFields = [], ?string $existingCustomHeadersRaw = null): array
    {
        $errors = [];

        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
                $errors[] = "Missing required field: {$field}";
            }
        }

        if (isset($data['uuid']) && !self::isValidUuid((string) $data['uuid'])) {
            $errors[] = 'Invalid UUID format';
        }

        if (isset($data['name']) && (!is_string($data['name']) || strlen($data['name']) > 191)) {
            $errors[] = 'Name must be a string with maximum 191 characters';
        }

        if (isset($data['fqdn']) && (!is_string($data['fqdn']) || trim($data['fqdn']) === '')) {
            $errors[] = 'FQDN must be a non-empty string';
        }

        if (isset($data['location_id']) && (!is_numeric($data['location_id']) || (int) $data['location_id'] <= 0)) {
            $errors[] = 'Location ID must be a positive number';
        }

        if (isset($data['scheme']) && !in_array($data['scheme'], ['http', 'https'], true)) {
            $errors[] = 'Scheme must be either http or https';
        }

        if (isset($data['memory']) && (!is_numeric($data['memory']) || (int) $data['memory'] < 0)) {
            $errors[] = 'Memory must be a non-negative number';
        }

        if (isset($data['disk']) && (!is_numeric($data['disk']) || (int) $data['disk'] < 0)) {
            $errors[] = 'Disk space must be a non-negative number';
        }

        if (isset($data['daemonListen']) && (!is_numeric($data['daemonListen']) || (int) $data['daemonListen'] < 1 || (int) $data['daemonListen'] > 65535)) {
            $errors[] = 'Daemon port must be a valid TCP port (1-65535)';
        }

        if (isset($data['daemonBase']) && (!is_string($data['daemonBase']) || trim($data['daemonBase']) === '')) {
            $errors[] = 'Daemon base path must be a non-empty string';
        }

        foreach (['websitesPath', 'backupsPath', 'addonsPath'] as $pathField) {
            if (isset($data[$pathField]) && $data[$pathField] !== null && $data[$pathField] !== '') {
                if (!is_string($data[$pathField]) || trim($data[$pathField]) === '') {
                    $errors[] = "{$pathField} must be a non-empty string when provided";
                }
            }
        }

        if (isset($data['quilldConfigOverrides']) && $data['quilldConfigOverrides'] !== null && $data['quilldConfigOverrides'] !== '') {
            if (!is_string($data['quilldConfigOverrides'])) {
                $errors[] = 'quilldConfigOverrides must be a JSON string';
            } else {
                $decoded = json_decode(trim($data['quilldConfigOverrides']), true);
                if (!is_array($decoded)) {
                    $errors[] = 'quilldConfigOverrides must be valid JSON object';
                }
            }
        }

        if (isset($data['remoteTimeout']) && (!is_numeric($data['remoteTimeout']) || (int) $data['remoteTimeout'] < 1)) {
            $errors[] = 'remoteTimeout must be a positive number';
        }

        if (isset($data['remoteRetryLimit']) && (!is_numeric($data['remoteRetryLimit']) || (int) $data['remoteRetryLimit'] < 0)) {
            $errors[] = 'remoteRetryLimit must be a non-negative number';
        }

        if (isset($data['remoteCustomHeaders']) && $data['remoteCustomHeaders'] !== null && $data['remoteCustomHeaders'] !== '') {
            if (!is_string($data['remoteCustomHeaders'])) {
                $errors[] = 'remoteCustomHeaders must be a JSON string';
            } else {
                $errors = array_merge($errors, WebNodeCustomHeaders::validateIncoming($data['remoteCustomHeaders'], $existingCustomHeadersRaw));
            }
        }

        if (isset($data['sftpKeyAlgorithm']) && is_string($data['sftpKeyAlgorithm']) && trim($data['sftpKeyAlgorithm']) === '') {
            $errors[] = 'sftpKeyAlgorithm must not be empty when provided';
        }

        if (isset($data['sftpPort']) && (!is_numeric($data['sftpPort']) || (int) $data['sftpPort'] < 1 || (int) $data['sftpPort'] > 65535)) {
            $errors[] = 'sftpPort must be a valid TCP port (1-65535)';
        }

        if (isset($data['ftpPort']) && (!is_numeric($data['ftpPort']) || (int) $data['ftpPort'] < 1 || (int) $data['ftpPort'] > 65535)) {
            $errors[] = 'ftpPort must be a valid TCP port (1-65535)';
        }

        if (isset($data['ftpPassivePortMin']) && (!is_numeric($data['ftpPassivePortMin']) || (int) $data['ftpPassivePortMin'] < 1024 || (int) $data['ftpPassivePortMin'] > 65535)) {
            $errors[] = 'ftpPassivePortMin must be a valid TCP port (1024-65535)';
        }

        if (isset($data['ftpPassivePortMax']) && (!is_numeric($data['ftpPassivePortMax']) || (int) $data['ftpPassivePortMax'] < 1024 || (int) $data['ftpPassivePortMax'] > 65535)) {
            $errors[] = 'ftpPassivePortMax must be a valid TCP port (1024-65535)';
        }

        if (
            isset($data['ftpPassivePortMin'], $data['ftpPassivePortMax'])
            && is_numeric($data['ftpPassivePortMin'])
            && is_numeric($data['ftpPassivePortMax'])
            && (int) $data['ftpPassivePortMax'] < (int) $data['ftpPassivePortMin']
        ) {
            $errors[] = 'ftpPassivePortMax must be greater than or equal to ftpPassivePortMin';
        }

        if (isset($data['backendPortMin']) && (!is_numeric($data['backendPortMin']) || (int) $data['backendPortMin'] < 1 || (int) $data['backendPortMin'] > 65535)) {
            $errors[] = 'backendPortMin must be a valid TCP port (1-65535)';
        }

        if (isset($data['backendPortMax']) && (!is_numeric($data['backendPortMax']) || (int) $data['backendPortMax'] < 1 || (int) $data['backendPortMax'] > 65535)) {
            $errors[] = 'backendPortMax must be a valid TCP port (1-65535)';
        }

        if (
            isset($data['backendPortMin'], $data['backendPortMax'])
            && is_numeric($data['backendPortMin'])
            && is_numeric($data['backendPortMax'])
            && (int) $data['backendPortMax'] < (int) $data['backendPortMin']
        ) {
            $errors[] = 'backendPortMax must be greater than or equal to backendPortMin';
        }

        return $errors;
    }

    /**
     * Create a new web node.
     *
     * @param array<string, mixed> $data
     *
     * @return int|false The new web node ID or false on failure
     */
    public static function createWebNode(array $data): int | false
    {
        $required = [
            'uuid',
            'name',
            'fqdn',
            'location_id',
            'daemon_token_id',
            'daemon_token',
        ];

        $errors = self::validateWebNodeData($data, $required);
        if (!empty($errors)) {
            $sanitized = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Web node validation failed: ' . implode('; ', $errors) . ' for node: ' . ($data['name'] ?? 'unknown') . ' with data: ' . json_encode($sanitized));

            return false;
        }

        $location = Location::getById((int) $data['location_id']);
        if (!$location) {
            $sanitized = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid location_id: ' . $data['location_id'] . ' for web node: ' . $data['name'] . ' with data: ' . json_encode($sanitized));

            return false;
        }

        if (($location['type'] ?? 'game') !== 'web') {
            $sanitized = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Location is not marked as web hosting location_id: ' . $data['location_id'] . ' for web node: ' . $data['name'] . ' with data: ' . json_encode($sanitized));

            return false;
        }

        $data['location_id'] = (int) $data['location_id'];

        $booleanFields = [
            'public',
            'behind_proxy',
            'proxyEnabled',
            'acmeStaging',
            'maintenance_mode',
            'sftpEnabled',
            'sftpDisablePasswordAuth',
            'ftpEnabled',
            'backupsS3ForcePathStyle',
        ];
        foreach ($booleanFields as $field) {
            if (isset($data[$field])) {
                $data[$field] = filter_var($data[$field], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
            }
        }

        if (isset($data['proxyProvider'])) {
            $provider = strtolower(trim((string) $data['proxyProvider']));
            $data['proxyProvider'] = in_array($provider, ['caddy', 'nginx', 'traefik'], true) ? $provider : 'caddy';
        }

        if (array_key_exists('acmeEmail', $data)) {
            $email = trim((string) ($data['acmeEmail'] ?? ''));
            $data['acmeEmail'] = $email !== '' ? $email : null;
        }

        if (isset($data['backupsProvider'])) {
            $bp = strtolower(trim((string) $data['backupsProvider']));
            $data['backupsProvider'] = in_array($bp, ['local', 's3', 'restic', 'pbs'], true) ? $bp : 'local';
        }

        foreach (['backupsS3Endpoint', 'backupsS3Region', 'backupsS3Bucket', 'backupsS3AccessKey', 'backupsS3SecretKey', 'backupsS3Prefix'] as $s3Field) {
            if (array_key_exists($s3Field, $data)) {
                $val = trim((string) ($data[$s3Field] ?? ''));
                $data[$s3Field] = $val !== '' ? $val : null;
            }
        }

        foreach (
            [
                'backupsResticRepository',
                'backupsResticPassword',
                'backupsResticBinary',
                'backupsPbsRepository',
                'backupsPbsPassword',
                'backupsPbsFingerprint',
                'backupsPbsBinary',
            ] as $backupField
        ) {
            if (array_key_exists($backupField, $data)) {
                $val = trim((string) ($data[$backupField] ?? ''));
                $data[$backupField] = $val !== '' ? $val : null;
            }
        }

        if (!isset($data['scheme']) || !in_array($data['scheme'], ['http', 'https'], true)) {
            $data['scheme'] = 'https';
        }

        if (!isset($data['daemonListen']) || !is_numeric($data['daemonListen'])) {
            $data['daemonListen'] = 8989;
        }

        if (!isset($data['daemonBase']) || trim((string) $data['daemonBase']) === '') {
            $data['daemonBase'] = '/var/lib/featherquilld';
        }

        if (!isset($data['memory']) || !is_numeric($data['memory'])) {
            $data['memory'] = 1024;
        }

        if (!isset($data['disk']) || !is_numeric($data['disk'])) {
            $data['disk'] = 4096;
        }

        if (!isset($data['upload_size']) || !is_numeric($data['upload_size'])) {
            $data['upload_size'] = 100;
        }

        if (!isset($data['remoteTimeout']) || !is_numeric($data['remoteTimeout'])) {
            $data['remoteTimeout'] = 30;
        }

        if (!isset($data['remoteRetryLimit']) || !is_numeric($data['remoteRetryLimit'])) {
            $data['remoteRetryLimit'] = 10;
        }

        if (!isset($data['sftpKeyAlgorithm']) || trim((string) $data['sftpKeyAlgorithm']) === '') {
            $data['sftpKeyAlgorithm'] = 'ssh-ed25519';
        }

        if (!isset($data['sftpPort']) || !is_numeric($data['sftpPort'])) {
            $data['sftpPort'] = 2222;
        }

        if (!isset($data['ftpPort']) || !is_numeric($data['ftpPort'])) {
            $data['ftpPort'] = 21;
        }

        if (!isset($data['ftpPassivePortMin']) || !is_numeric($data['ftpPassivePortMin'])) {
            $data['ftpPassivePortMin'] = 50000;
        }

        if (!isset($data['ftpPassivePortMax']) || !is_numeric($data['ftpPassivePortMax'])) {
            $data['ftpPassivePortMax'] = 50100;
        }

        if (!isset($data['ftpEnabled']) || $data['ftpEnabled'] === '') {
            $data['ftpEnabled'] = 0;
        }

        if (!isset($data['backendPortMin']) || !is_numeric($data['backendPortMin'])) {
            $data['backendPortMin'] = 20000;
        } else {
            $data['backendPortMin'] = (int) $data['backendPortMin'];
        }

        if (!isset($data['backendPortMax']) || !is_numeric($data['backendPortMax'])) {
            $data['backendPortMax'] = 29999;
        } else {
            $data['backendPortMax'] = (int) $data['backendPortMax'];
        }

        if (!isset($data['sftpEnabled'])) {
            $data['sftpEnabled'] = 1;
        }

        if (!isset($data['sftpDisablePasswordAuth'])) {
            $data['sftpDisablePasswordAuth'] = 0;
        }

        if (isset($data['remoteCustomHeaders'])) {
            $data['remoteCustomHeaders'] = WebNodeCustomHeaders::normalizeForStorage(
                is_string($data['remoteCustomHeaders']) ? $data['remoteCustomHeaders'] : null,
            );
        }

        if (isset($data['daemon_token_id']) && is_string($data['daemon_token_id']) && $data['daemon_token_id'] !== '') {
            $data['daemon_token_id'] = App::getInstance(true)->encryptValue($data['daemon_token_id']);
        }
        if (isset($data['daemon_token']) && is_string($data['daemon_token']) && $data['daemon_token'] !== '') {
            $data['daemon_token'] = App::getInstance(true)->encryptValue($data['daemon_token']);
        }

        $hasId = isset($data['id']) && is_int($data['id']) && $data['id'] > 0;
        $filteredData = array_intersect_key($data, array_flip(self::$allowedFields));

        $pdo = Database::getPdoConnection();
        $fields = array_keys($filteredData);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (`' . implode('`,`', $fields) . '`) VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);

        if ($stmt->execute($filteredData)) {
            return $hasId ? (int) $filteredData['id'] : (int) $pdo->lastInsertId();
        }

        $sanitized = self::sanitizeDataForLogging($data);
        App::getInstance(true)->getLogger()->error('Failed to create web node: ' . $sql . ' for node: ' . ($data['name'] ?? 'unknown') . ' with data: ' . json_encode($sanitized) . ' and error: ' . json_encode($stmt->errorInfo()));

        return false;
    }

    /**
     * Alias for createWebNode.
     *
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        return self::createWebNode($data);
    }

    /**
     * Fetch a web node by ID.
     *
     * @return array<string, mixed>|null
     */
    public static function getWebNodeById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
        if ($row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $row;
    }

    /**
     * Fetch a web node by UUID.
     *
     * @return array<string, mixed>|null
     */
    public static function getWebNodeByUuid(string $uuid): ?array
    {
        if (!self::isValidUuid($uuid)) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $uuid]);

        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
        if ($row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $row;
    }

    /**
     * Fetch all web nodes.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getAllWebNodes(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' ORDER BY name ASC');
        $stmt->execute();

        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $rows;
    }

    /**
     * Search web nodes with pagination and filtering.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function searchWebNodes(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        ?int $locationId = null,
    ): array {
        $pdo = Database::getPdoConnection();
        $offset = ($page - 1) * $limit;
        $params = [];

        $sql = 'SELECT n.*, l.name as location_name, l.type as location_type FROM ' . self::$table . ' n';
        $sql .= ' LEFT JOIN featherpanel_locations l ON n.location_id = l.id';
        $sql .= " WHERE 1=1 AND l.type = 'web'";

        if (!empty($search)) {
            $sql .= ' AND (n.name LIKE :search OR n.description LIKE :search OR n.fqdn LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($locationId !== null) {
            $sql .= ' AND n.location_id = :location_id';
            $params['location_id'] = $locationId;
        }

        $sql .= ' ORDER BY n.name ASC';
        $sql .= ' LIMIT :limit OFFSET :offset';

        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $rows;
    }

    /**
     * Get total count of web nodes with optional filtering.
     */
    public static function getWebNodesCount(
        string $search = '',
        ?int $locationId = null,
    ): int {
        $pdo = Database::getPdoConnection();
        $params = [];

        $sql = 'SELECT COUNT(*) FROM ' . self::$table . ' n';
        $sql .= ' LEFT JOIN featherpanel_locations l ON n.location_id = l.id';
        $sql .= " WHERE 1=1 AND l.type = 'web'";

        if (!empty($search)) {
            $sql .= ' AND (n.name LIKE :search OR n.description LIKE :search OR n.fqdn LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($locationId !== null) {
            $sql .= ' AND n.location_id = :location_id';
            $params['location_id'] = $locationId;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Update a web node by ID.
     *
     * @param array<string, mixed> $data
     */
    public static function updateWebNodeById(int $id, array $data): bool
    {
        if ($id <= 0) {
            App::getInstance(true)->getLogger()->error('Invalid web node ID: ' . $id . ' with data: ' . json_encode($data));

            return false;
        }

        if (isset($data['location_id'])) {
            $location = Location::getById((int) $data['location_id']);
            if (!$location) {
                App::getInstance(true)->getLogger()->error('Invalid location_id: ' . $data['location_id'] . ' for web node with data: ' . json_encode($data));

                return false;
            }

            if (($location['type'] ?? 'game') !== 'web') {
                App::getInstance(true)->getLogger()->error('Location is not marked as web hosting location_id: ' . $data['location_id'] . ' for web node with data: ' . json_encode($data));

                return false;
            }

            $data['location_id'] = (int) $data['location_id'];
        }

        if (!empty($data)) {
            $existingHeadersRaw = null;
            if (isset($data['remoteCustomHeaders'])) {
                $existing = self::getWebNodeByIdRaw($id);
                $existingHeadersRaw = is_array($existing) && is_string($existing['remoteCustomHeaders'] ?? null)
                    ? $existing['remoteCustomHeaders']
                    : null;
            }

            $errors = self::validateWebNodeData($data, [], $existingHeadersRaw);
            if (!empty($errors)) {
                App::getInstance(true)->getLogger()->error('Web node update validation failed for ID ' . $id . ': ' . implode('; ', $errors));

                return false;
            }
        }

        $booleanFields = [
            'public',
            'behind_proxy',
            'proxyEnabled',
            'acmeStaging',
            'maintenance_mode',
            'sftpEnabled',
            'sftpDisablePasswordAuth',
            'ftpEnabled',
            'backupsS3ForcePathStyle',
        ];
        foreach ($booleanFields as $field) {
            if (isset($data[$field])) {
                $data[$field] = filter_var($data[$field], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
            }
        }

        if (isset($data['proxyProvider'])) {
            $provider = strtolower(trim((string) $data['proxyProvider']));
            $data['proxyProvider'] = in_array($provider, ['caddy', 'nginx', 'traefik'], true) ? $provider : 'caddy';
        }

        if (array_key_exists('acmeEmail', $data)) {
            $email = trim((string) ($data['acmeEmail'] ?? ''));
            $data['acmeEmail'] = $email !== '' ? $email : null;
        }

        if (isset($data['backupsProvider'])) {
            $bp = strtolower(trim((string) $data['backupsProvider']));
            $data['backupsProvider'] = in_array($bp, ['local', 's3', 'restic', 'pbs'], true) ? $bp : 'local';
        }

        foreach (['backupsS3Endpoint', 'backupsS3Region', 'backupsS3Bucket', 'backupsS3AccessKey', 'backupsS3SecretKey', 'backupsS3Prefix'] as $s3Field) {
            if (array_key_exists($s3Field, $data)) {
                $val = trim((string) ($data[$s3Field] ?? ''));
                // Keep existing secret when the form submits an empty value.
                if ($s3Field === 'backupsS3SecretKey' && $val === '') {
                    unset($data[$s3Field]);
                    continue;
                }
                $data[$s3Field] = $val !== '' ? $val : null;
            }
        }

        foreach (
            [
                'backupsResticRepository',
                'backupsResticPassword',
                'backupsResticBinary',
                'backupsPbsRepository',
                'backupsPbsPassword',
                'backupsPbsFingerprint',
                'backupsPbsBinary',
            ] as $backupField
        ) {
            if (array_key_exists($backupField, $data)) {
                $val = trim((string) ($data[$backupField] ?? ''));
                // Keep existing secrets when the form submits an empty value.
                if (($backupField === 'backupsResticPassword' || $backupField === 'backupsPbsPassword') && $val === '') {
                    unset($data[$backupField]);
                    continue;
                }
                $data[$backupField] = $val !== '' ? $val : null;
            }
        }

        if (isset($data['remoteCustomHeaders']) && is_string($data['remoteCustomHeaders']) && trim($data['remoteCustomHeaders']) === '') {
            $data['remoteCustomHeaders'] = null;
        }

        if (isset($data['remoteCustomHeaders'])) {
            $existing = self::getWebNodeByIdRaw($id);
            $existingHeaders = is_array($existing) ? ($existing['remoteCustomHeaders'] ?? null) : null;
            $data['remoteCustomHeaders'] = WebNodeCustomHeaders::normalizeForStorage(
                is_string($data['remoteCustomHeaders']) ? $data['remoteCustomHeaders'] : null,
                is_string($existingHeaders) ? $existingHeaders : null,
            );
        }

        if (isset($data['daemon_token_id']) && is_string($data['daemon_token_id']) && $data['daemon_token_id'] !== '') {
            $data['daemon_token_id'] = App::getInstance(true)->encryptValue($data['daemon_token_id']);
        }
        if (isset($data['daemon_token']) && is_string($data['daemon_token']) && $data['daemon_token'] !== '') {
            $data['daemon_token'] = App::getInstance(true)->encryptValue($data['daemon_token']);
        }

        if (isset($data['backendPortMin']) && is_numeric($data['backendPortMin'])) {
            $data['backendPortMin'] = (int) $data['backendPortMin'];
        }
        if (isset($data['backendPortMax']) && is_numeric($data['backendPortMax'])) {
            $data['backendPortMax'] = (int) $data['backendPortMax'];
        }

        $filteredData = array_intersect_key($data, array_flip(self::$allowedFields));
        unset($filteredData['id'], $filteredData['uuid']);

        if (empty($filteredData)) {
            return true;
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($filteredData);
        $set = array_map(static fn ($f) => "`{$f}` = :{$f}", $fields);
        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(',', $set) . ' WHERE id = :id';

        $params = $filteredData;
        $params['id'] = $id;

        $stmt = $pdo->prepare($sql);

        return $stmt->execute($params);
    }

    /**
     * Hard delete a web node by ID.
     */
    public static function hardDeleteWebNode(int $id): bool
    {
        if ($id <= 0) {
            App::getInstance(true)->getLogger()->error('Invalid web node ID: ' . $id);

            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Get table columns information.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DESCRIBE ' . self::$table);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get count of web nodes based on conditions.
     *
     * @param array<string, mixed> $conditions
     */
    public static function count(array $conditions = []): int
    {
        $pdo = Database::getPdoConnection();
        if ($conditions === []) {
            $stmt = $pdo->query('SELECT COUNT(*) FROM ' . self::$table);

            return (int) $stmt->fetchColumn();
        }

        $where = implode(' AND ', array_map(static fn ($k) => "{$k} = :{$k}", array_keys($conditions)));
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE ' . $where);
        $stmt->execute($conditions);

        return (int) $stmt->fetchColumn();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function getByLocationId(int $locationId): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE location_id = :location_id ORDER BY name ASC');
        $stmt->execute(['location_id' => $locationId]);

        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $rows;
    }

    /**
     * Generate a cryptographically secure UUID for web nodes.
     */
    public static function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0F | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3F | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    /**
     * Generate a daemon token ID (fqld_ prefix + 12 random chars).
     */
    public static function generateDaemonTokenId(): string
    {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        $tokenId = 'fqld_';
        $randomBytes = random_bytes(12);
        for ($i = 0; $i < 12; ++$i) {
            $tokenId .= $chars[ord($randomBytes[$i]) % strlen($chars)];
        }

        return $tokenId;
    }

    /**
     * Generate a daemon token (64 characters).
     */
    public static function generateDaemonToken(): string
    {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        $token = '';
        $randomBytes = random_bytes(64);
        for ($i = 0; $i < 64; ++$i) {
            $token .= $chars[ord($randomBytes[$i]) % strlen($chars)];
        }

        return $token;
    }

    /**
     * Validate UUID format.
     */
    public static function isValidUuid(string $uuid): bool
    {
        return (bool) preg_match('/^[a-f0-9\-]{36}$/i', $uuid);
    }

    /**
     * Resolve a storage path, falling back to a subdirectory under daemonBase.
     */
    public static function resolveStoragePath(array $node, string $field, string $subdir): string
    {
        $custom = $node[$field] ?? null;
        if (is_string($custom) && trim($custom) !== '') {
            return rtrim(trim($custom), '/');
        }

        $base = rtrim((string) ($node['daemonBase'] ?? FeatherQuilldCapabilities::defaults()['daemon_base']), '/');

        return $base . '/' . $subdir;
    }

    /**
     * Authenticate a FeatherQuilld daemon by token ID and secret.
     *
     * @return array<string, mixed>|null
     */
    public static function getWebNodeByDaemonAuth(string $tokenId, string $tokenSecret): ?array
    {
        try {
            if ($tokenId === '' || $tokenSecret === '') {
                return null;
            }

            $cacheKey = 'quilld_auth_node:' . hash('sha256', $tokenId . "\0" . $tokenSecret);
            $cachedNodeId = Cache::get($cacheKey);
            if (is_numeric($cachedNodeId) && (int) $cachedNodeId > 0) {
                $cachedNode = self::getWebNodeById((int) $cachedNodeId);
                if (
                    $cachedNode !== null
                    && ($cachedNode['daemon_token_id'] ?? '') === $tokenId
                    && ($cachedNode['daemon_token'] ?? '') === $tokenSecret
                ) {
                    return $cachedNode;
                }
                Cache::forget($cacheKey);
            }

            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('SELECT * FROM ' . self::$table);
            $stmt->execute();
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            foreach ($rows as $row) {
                try {
                    $storedId = App::getInstance(true)->decryptValue($row['daemon_token_id'] ?? '');
                    $storedSecret = App::getInstance(true)->decryptValue($row['daemon_token'] ?? '');
                } catch (\Throwable $e) {
                    App::getInstance(true)->getLogger()->error(
                        'FeatherQuilld auth decrypt failed for web node ' . ($row['id'] ?? '?') . ': ' . $e->getMessage(),
                    );

                    continue;
                }

                if ($storedId === $tokenId && $storedSecret === $tokenSecret) {
                    Cache::put($cacheKey, (int) $row['id'], 5);

                    return self::decryptSensitiveFields($row);
                }
            }
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('FeatherQuilld auth fetch failed: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Generate FeatherQuilld join/bootstrap config (embedded in setup --join-data).
     *
     * @param array<string, mixed> $node
     */
    public static function generateFeatherQuilldJoinConfigYaml(array $node, string $panelUrl): string
    {
        return FeatherQuilldConfigBuilder::buildJoinConfigYaml($node, $panelUrl);
    }

    /**
     * Generate FeatherQuilld runtime config served at GET /api/quilld-remote/config.
     *
     * @param array<string, mixed> $node
     */
    public static function generateFeatherQuilldRuntimeConfigYaml(array $node, string $panelUrl): string
    {
        return FeatherQuilldConfigBuilder::buildRuntimeConfigYaml($node, $panelUrl);
    }

    /**
     * Generate full FeatherQuilld config.yml (join + runtime) for admin inspection.
     *
     * @param array<string, mixed> $node
     */
    public static function generateFeatherQuilldConfigYaml(array $node, string $panelUrl): string
    {
        return FeatherQuilldConfigBuilder::buildConfigYaml($node, $panelUrl);
    }

    /**
     * Redact secret custom header values before returning a web node to the admin API.
     *
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    public static function sanitizeForAdminResponse(array $row): array
    {
        if (isset($row['remoteCustomHeaders'])) {
            $row['remoteCustomHeaders'] = WebNodeCustomHeaders::redactForAdmin(
                is_string($row['remoteCustomHeaders']) ? $row['remoteCustomHeaders'] : null,
            );
        }

        if (!empty($row['backupsS3SecretKey'])) {
            $row['backupsS3SecretKey'] = '';
        }

        if (!empty($row['backupsResticPassword'])) {
            $row['backupsResticPassword'] = '';
        }

        if (!empty($row['backupsPbsPassword'])) {
            $row['backupsPbsPassword'] = '';
        }

        return $row;
    }

    /**
     * Load web node row with encrypted DB values (no token/header decryption).
     *
     * @return array<string, mixed>|null
     */
    private static function getWebNodeByIdRaw(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /**
     * Sanitize data for logging by excluding sensitive fields.
     *
     * @param array<string, mixed> $data
     *
     * @return array<string, mixed>
     */
    private static function sanitizeDataForLogging(array $data): array
    {
        $sensitiveFields = [
            'daemon_token',
            'daemon_token_id',
        ];

        $sanitized = $data;
        foreach ($sensitiveFields as $field) {
            if (isset($sanitized[$field])) {
                $sanitized[$field] = '[REDACTED]';
            }
        }

        return $sanitized;
    }

    /**
     * Decrypt sensitive fields for application usage.
     *
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    private static function decryptSensitiveFields(array $row): array
    {
        try {
            if (isset($row['daemon_token_id']) && is_string($row['daemon_token_id']) && $row['daemon_token_id'] !== '') {
                $row['daemon_token_id'] = App::getInstance(true)->decryptValue($row['daemon_token_id']);
            }
            if (isset($row['daemon_token']) && is_string($row['daemon_token']) && $row['daemon_token'] !== '') {
                $row['daemon_token'] = App::getInstance(true)->decryptValue($row['daemon_token']);
            }
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to decrypt web node sensitive fields: ' . $e->getMessage());
        }

        return $row;
    }
}
