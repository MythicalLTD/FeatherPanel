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
 * ServerCustomVariable service/model for user-managed server environment variables.
 */
class ServerCustomVariable
{
    private static string $table = 'featherpanel_server_custom_variables';

    private static array $allowedFields = [
        'server_id',
        'user_id',
        'name',
        'env_variable',
        'variable_value',
        'is_encrypted',
    ];

    public static function createCustomVariable(array $data): int | false
    {
        $required = ['server_id', 'user_id', 'name', 'env_variable', 'variable_value'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                App::getInstance(true)->getLogger()->error('Missing required field for custom server variable: ' . $field);

                return false;
            }
        }

        if (!is_numeric($data['server_id']) || (int) $data['server_id'] <= 0 || !Server::getServerById((int) $data['server_id'])) {
            return false;
        }

        if (!is_numeric($data['user_id']) || (int) $data['user_id'] <= 0 || !User::getUserById((int) $data['user_id'])) {
            return false;
        }

        $data['name'] = trim((string) $data['name']);
        $data['env_variable'] = strtoupper(trim((string) $data['env_variable']));
        $data['variable_value'] = (string) $data['variable_value'];
        $data['is_encrypted'] = isset($data['is_encrypted']) && filter_var($data['is_encrypted'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;

        if ($data['name'] === '' || strlen($data['name']) > 191) {
            return false;
        }

        if (!self::isValidEnvVariable($data['env_variable']) || strlen($data['env_variable']) > 191) {
            return false;
        }

        if (self::envVariableExists((int) $data['server_id'], $data['env_variable'])) {
            return false;
        }

        if ((int) $data['is_encrypted'] === 1) {
            $data['variable_value'] = App::getInstance(true)->encryptValue($data['variable_value']);
        }

        $filteredData = array_intersect_key($data, array_flip(self::$allowedFields));

        $pdo = Database::getPdoConnection();
        $fields = array_keys($filteredData);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);

        if ($stmt->execute($filteredData)) {
            return (int) $pdo->lastInsertId();
        }

        return false;
    }

    public static function getCustomVariableById(int $id, bool $revealEncrypted = false): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        return $row ? self::prepareForOutput($row, $revealEncrypted) : null;
    }

    public static function getCustomVariablesByServerId(int $serverId, bool $revealEncrypted = false): array
    {
        if ($serverId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id ORDER BY id ASC');
        $stmt->execute(['server_id' => $serverId]);

        return array_map(
            fn (array $row) => self::prepareForOutput($row, $revealEncrypted),
            $stmt->fetchAll(\PDO::FETCH_ASSOC)
        );
    }

    public static function getEnvironmentVariablesByServerId(int $serverId): array
    {
        $variables = [];
        foreach (self::getCustomVariablesByServerId($serverId, true) as $variable) {
            $variables[$variable['env_variable']] = $variable['variable_value'];
        }

        return $variables;
    }

    public static function deleteCustomVariableForServer(int $id, int $serverId): bool
    {
        if ($id <= 0 || $serverId <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id AND server_id = :server_id');
        $stmt->execute([
            'id' => $id,
            'server_id' => $serverId,
        ]);

        return $stmt->rowCount() > 0;
    }

    public static function envVariableExists(int $serverId, string $envVariable): bool
    {
        if ($serverId <= 0 || trim($envVariable) === '') {
            return false;
        }

        $envVariable = strtoupper(trim($envVariable));
        $server = Server::getServerById($serverId);
        if (!$server) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE server_id = :server_id AND env_variable = :env_variable');
        $stmt->execute([
            'server_id' => $serverId,
            'env_variable' => $envVariable,
        ]);

        if ((int) $stmt->fetchColumn() > 0) {
            return true;
        }

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM featherpanel_spell_variables WHERE spell_id = :spell_id AND env_variable = :env_variable');
        $stmt->execute([
            'spell_id' => (int) $server['spell_id'],
            'env_variable' => $envVariable,
        ]);

        return (int) $stmt->fetchColumn() > 0;
    }

    public static function isValidEnvVariable(string $envVariable): bool
    {
        return preg_match('/^[A-Z_][A-Z0-9_]*$/', $envVariable) === 1;
    }

    private static function prepareForOutput(array $row, bool $revealEncrypted): array
    {
        $row['is_encrypted'] = (int) ($row['is_encrypted'] ?? 0);
        if ($row['is_encrypted'] !== 1) {
            return $row;
        }

        if ($revealEncrypted) {
            try {
                $row['variable_value'] = App::getInstance(true)->decryptValue((string) $row['variable_value']);
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->error('Failed to decrypt custom server variable: ' . $e->getMessage());
                $row['variable_value'] = '';
            }

            return $row;
        }

        $row['variable_value'] = '********';

        return $row;
    }
}
