<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Chat;

/**
 * SpellVariable service/model for CRUD operations on the featherpanel_spell_variables table.
 */
class SpellVariable
{
    private static string $table = 'featherpanel_spell_variables';

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
        // Log incoming data for debugging
        \App\App::getInstance(true)->getLogger()->debug('SpellVariable::createVariable called with data: ' . json_encode($data));
        
        // Validate required fields exist
        // Note: name and env_variable must be non-empty, but description and default_value can be empty strings (Pterodactyl compatibility)
        if (!isset($data['spell_id']) || !is_numeric($data['spell_id']) || (int) $data['spell_id'] <= 0) {
            \App\App::getInstance(true)->getLogger()->error('SpellVariable validation failed: Invalid spell_id. Data: ' . json_encode($data));
            return false;
        }
        if (!isset($data['name']) || trim((string) $data['name']) === '') {
            \App\App::getInstance(true)->getLogger()->error('SpellVariable validation failed: Missing or empty name. Data: ' . json_encode($data));
            return false;
        }
        if (!isset($data['env_variable']) || trim((string) $data['env_variable']) === '') {
            \App\App::getInstance(true)->getLogger()->error('SpellVariable validation failed: Missing or empty env_variable. Data: ' . json_encode($data));
            return false;
        }
        if (!isset($data['description'])) {
            \App\App::getInstance(true)->getLogger()->error('SpellVariable validation failed: description not set. Data: ' . json_encode($data));
            return false;
        }
        if (!isset($data['default_value'])) {
            \App\App::getInstance(true)->getLogger()->error('SpellVariable validation failed: default_value not set. Data: ' . json_encode($data));
            return false;
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

        // Log the actual database error
        $errorInfo = $stmt->errorInfo();
        \App\App::getInstance(true)->getLogger()->error('SpellVariable database insert failed. SQL: ' . $sql . '. Data: ' . json_encode($filteredData) . '. Error: ' . json_encode($errorInfo));
        
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
