<?php

/*
 * This file is part of App.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Chat;

/**
 * SpellVariable service/model for CRUD operations on the mythicalpanel_spell_variables table.
 */
class SpellVariable
{
    private static string $table = 'mythicalpanel_spell_variables';

    /**
     * Whitelist of allowed field names for SQL queries to prevent injection.
     */
    private static array $allowedFields = [
        'spell_id',
        'name',
        'description',
        'env_variable',
        'default_value',
        'user_viewable',
        'user_editable',
        'rules',
        'field_type',
    ];

    public static function createVariable(array $data): int|false
    {
        $required = ['spell_id', 'name', 'env_variable', 'description', 'default_value'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
                return false;
            }
        }
        if (isset($data['user_viewable'])) {
            $data['user_viewable'] = filter_var($data['user_viewable'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        }
        if (isset($data['user_editable'])) {
            $data['user_editable'] = filter_var($data['user_editable'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        }

        // Filter data to only include allowed fields
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

    public static function getVariablesBySpellId(int $spellId): array
    {
        if ($spellId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE spell_id = :spell_id ORDER BY id ASC');
        $stmt->execute(['spell_id' => $spellId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function getVariableById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function updateVariable(int $id, array $data): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        if (isset($data['user_viewable'])) {
            $data['user_viewable'] = filter_var($data['user_viewable'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        }
        if (isset($data['user_editable'])) {
            $data['user_editable'] = filter_var($data['user_editable'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        }
        unset($data['id']);

        // Filter data to only include allowed fields
        $filteredData = array_intersect_key($data, array_flip(self::$allowedFields));

        $fields = array_keys($filteredData);
        $set = array_map(fn ($f) => "`$f` = :$f", $fields);
        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(',', $set) . ' WHERE id = :id';
        $params = $filteredData;
        $params['id'] = $id;
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($params);
    }

    public static function deleteVariable(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }
}
