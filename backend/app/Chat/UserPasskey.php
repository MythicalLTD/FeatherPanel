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
 * Stored WebAuthn passkeys for users.
 */
class UserPasskey
{
    public const MAX_PASSKEYS_PER_USER = 10;
    private static string $table = 'featherpanel_user_passkeys';

    public static function countByUserUuid(string $userUuid): int
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
            return 0;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE user_uuid = :uuid');
        $stmt->execute(['uuid' => $userUuid]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function listByUserUuid(string $userUuid): array
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT id, user_uuid, credential_id, sign_count, transports, aaguid, label, created_at, updated_at FROM '
            . self::$table . ' WHERE user_uuid = :uuid ORDER BY id ASC'
        );
        $stmt->execute(['uuid' => $userUuid]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function getByCredentialIdBinary(string $credentialIdBinary): ?array
    {
        if ($credentialIdBinary === '') {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . ' WHERE credential_id = :cid LIMIT 1'
        );
        $stmt->bindValue('cid', $credentialIdBinary, \PDO::PARAM_LOB);
        $stmt->execute();
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row !== false ? $row : null;
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        $required = ['user_uuid', 'credential_id', 'public_key', 'sign_count', 'attestation_type'];
        foreach ($required as $f) {
            if (!isset($data[$f])) {
                return false;
            }
        }
        if (!preg_match('/^[a-f0-9\-]{36}$/i', (string) $data['user_uuid'])) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $fields = ['user_uuid', 'credential_id', 'public_key', 'sign_count', 'attestation_type'];
        $insert = [
            'user_uuid' => $data['user_uuid'],
            'credential_id' => $data['credential_id'],
            'public_key' => $data['public_key'],
            'sign_count' => (int) $data['sign_count'],
            'attestation_type' => (string) $data['attestation_type'],
        ];
        if (isset($data['transports'])) {
            $fields[] = 'transports';
            $insert['transports'] = is_string($data['transports']) ? $data['transports'] : json_encode($data['transports']);
        }
        if (isset($data['aaguid'])) {
            $fields[] = 'aaguid';
            $insert['aaguid'] = $data['aaguid'];
        }
        if (isset($data['label'])) {
            $fields[] = 'label';
            $insert['label'] = $data['label'];
        }
        if (isset($data['backup_eligible'])) {
            $fields[] = 'backup_eligible';
            $insert['backup_eligible'] = (int) (bool) $data['backup_eligible'];
        }
        if (isset($data['backup_status'])) {
            $fields[] = 'backup_status';
            $insert['backup_status'] = (int) (bool) $data['backup_status'];
        }
        if (isset($data['uv_initialized'])) {
            $fields[] = 'uv_initialized';
            $insert['uv_initialized'] = (int) (bool) $data['uv_initialized'];
        }
        $fieldList = '`' . implode('`, `', $fields) . '`';
        $placeholders = ':' . implode(', :', $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . $fieldList . ') VALUES (' . $placeholders . ')';
        $stmt = $pdo->prepare($sql);
        if (!$stmt->execute($insert)) {
            return false;
        }

        return (int) $pdo->lastInsertId();
    }

    public static function deleteByIdForUser(int $id, string $userUuid): bool
    {
        if ($id <= 0 || !preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id AND user_uuid = :uuid LIMIT 1');

        return $stmt->execute(['id' => $id, 'uuid' => $userUuid]) && $stmt->rowCount() > 0;
    }

    public static function updateSignState(
        int $id,
        int $signCount,
        ?bool $backupEligible,
        ?bool $backupStatus,
        ?bool $uvInitialized,
    ): bool {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table
            . ' SET sign_count = :sc, backup_eligible = :be, backup_status = :bs, uv_initialized = :uv WHERE id = :id'
        );

        return $stmt->execute([
            'sc' => $signCount,
            'be' => $backupEligible === null ? null : (int) $backupEligible,
            'bs' => $backupStatus === null ? null : (int) $backupStatus,
            'uv' => $uvInitialized === null ? null : (int) $uvInitialized,
            'id' => $id,
        ]);
    }

    public static function updateLabelForUser(int $id, string $userUuid, ?string $label): bool
    {
        if ($id <= 0 || !preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
            return false;
        }
        if ($label !== null && strlen($label) > 191) {
            $label = substr($label, 0, 191);
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table . ' SET label = :label WHERE id = :id AND user_uuid = :uuid LIMIT 1'
        );

        return $stmt->execute([
            'label' => $label === '' ? null : $label,
            'id' => $id,
            'uuid' => $userUuid,
        ]) && $stmt->rowCount() > 0;
    }
}
