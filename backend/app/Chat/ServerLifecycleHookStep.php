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

/**
 * Server lifecycle hook steps model for featherpanel_server_lifecycle_hook_steps.
 */
class ServerLifecycleHookStep
{
    private static string $table = 'featherpanel_server_lifecycle_hook_steps';

    /**
     * Get all steps for a hook ordered by sequence.
     */
    public static function getStepsByHookId(int $hookId): array
    {
        if ($hookId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE hook_id = :hook_id ORDER BY sequence_id ASC, id ASC');
        $stmt->execute(['hook_id' => $hookId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get step by id.
     */
    public static function getStepById(int $stepId): ?array
    {
        if ($stepId <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $stepId]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get next sequence id for hook.
     */
    public static function getNextSequenceId(int $hookId): int
    {
        if ($hookId <= 0) {
            return 1;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT MAX(sequence_id) FROM ' . self::$table . ' WHERE hook_id = :hook_id');
        $stmt->execute(['hook_id' => $hookId]);
        $max = (int) $stmt->fetchColumn();

        return $max + 1;
    }

    /**
     * Create hook step.
     */
    public static function createStep(array $data): int | false
    {
        $required = ['hook_id', 'sequence_id', 'task_type', 'payload', 'continue_on_failure'];
        foreach ($required as $field) {
            if (!array_key_exists($field, $data)) {
                return false;
            }
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$table . ' (hook_id, sequence_id, task_type, payload, continue_on_failure)
             VALUES (:hook_id, :sequence_id, :task_type, :payload, :continue_on_failure)'
        );

        $ok = $stmt->execute([
            'hook_id' => (int) $data['hook_id'],
            'sequence_id' => (int) $data['sequence_id'],
            'task_type' => (string) $data['task_type'],
            'payload' => (string) $data['payload'],
            'continue_on_failure' => (int) $data['continue_on_failure'],
        ]);

        if (!$ok) {
            return false;
        }

        return (int) $pdo->lastInsertId();
    }

    /**
     * Update step by id.
     */
    public static function updateStepById(int $stepId, array $data): bool
    {
        if ($stepId <= 0 || empty($data)) {
            return false;
        }

        unset($data['id'], $data['hook_id'], $data['created_at'], $data['updated_at']);
        if (empty($data)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $setClause = implode(', ', array_map(fn ($field) => $field . ' = :' . $field, $fields));
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET ' . $setClause . ' WHERE id = :id');

        $params = $data;
        $params['id'] = $stepId;

        return $stmt->execute($params);
    }

    /**
     * Update sequence ordering by moving one step.
     */
    public static function updateSequenceOrder(int $stepId, int $newSequenceId): bool
    {
        if ($stepId <= 0 || $newSequenceId <= 0) {
            return false;
        }

        $step = self::getStepById($stepId);
        if (!$step) {
            return false;
        }

        $hookId = (int) $step['hook_id'];
        $currentSequence = (int) $step['sequence_id'];
        if ($currentSequence === $newSequenceId) {
            return true;
        }

        $pdo = Database::getPdoConnection();
        $pdo->beginTransaction();
        try {
            if ($newSequenceId < $currentSequence) {
                $shiftStmt = $pdo->prepare(
                    'UPDATE ' . self::$table . '
                     SET sequence_id = sequence_id + 1
                     WHERE hook_id = :hook_id AND sequence_id >= :new_sequence AND sequence_id < :current_sequence'
                );
                $shiftStmt->execute([
                    'hook_id' => $hookId,
                    'new_sequence' => $newSequenceId,
                    'current_sequence' => $currentSequence,
                ]);
            } else {
                $shiftStmt = $pdo->prepare(
                    'UPDATE ' . self::$table . '
                     SET sequence_id = sequence_id - 1
                     WHERE hook_id = :hook_id AND sequence_id > :current_sequence AND sequence_id <= :new_sequence'
                );
                $shiftStmt->execute([
                    'hook_id' => $hookId,
                    'current_sequence' => $currentSequence,
                    'new_sequence' => $newSequenceId,
                ]);
            }

            $updateStmt = $pdo->prepare('UPDATE ' . self::$table . ' SET sequence_id = :new_sequence WHERE id = :id');
            $updateStmt->execute([
                'new_sequence' => $newSequenceId,
                'id' => $stepId,
            ]);

            $pdo->commit();

            return true;
        } catch (\Throwable $e) {
            $pdo->rollBack();

            return false;
        }
    }

    /**
     * Delete hook step by id.
     */
    public static function deleteStepById(int $stepId): bool
    {
        if ($stepId <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $stepId]);
    }

    /**
     * Reorder steps for hook to remove sequence gaps.
     */
    public static function reorderSteps(int $hookId): bool
    {
        if ($hookId <= 0) {
            return false;
        }

        $steps = self::getStepsByHookId($hookId);
        $pdo = Database::getPdoConnection();
        $pdo->beginTransaction();
        try {
            $sequence = 1;
            $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET sequence_id = :sequence_id WHERE id = :id');
            foreach ($steps as $step) {
                $stmt->execute([
                    'sequence_id' => $sequence,
                    'id' => (int) $step['id'],
                ]);
                ++$sequence;
            }
            $pdo->commit();

            return true;
        } catch (\Throwable $e) {
            $pdo->rollBack();

            return false;
        }
    }
}
