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

namespace App\Helpers;

use App\Chat\Database;

/**
 * External IDs are set by billing systems (WHMCS, Blesta, Paymenter) to find the
 * VDS or WebSpace they provisioned. They are used in URL paths, so only a safe
 * character set is accepted.
 */
class ExternalId
{
    public const MAX_LENGTH = 191;
    private const PATTERN = '/^[A-Za-z0-9._:@-]{1,191}$/';

    /**
     * Normalise a raw value from a request body.
     *
     * @return array{ok: bool, value: ?string}
     *                                         ok=false means the value is present but invalid;
     *                                         value=null with ok=true means "no external ID"
     */
    public static function normalize(mixed $raw): array
    {
        if ($raw === null) {
            return ['ok' => true, 'value' => null];
        }
        if (is_int($raw)) {
            $raw = (string) $raw;
        }
        if (!is_string($raw)) {
            return ['ok' => false, 'value' => null];
        }
        $value = trim($raw);
        if ($value === '') {
            return ['ok' => true, 'value' => null];
        }

        return self::isValid($value) ? ['ok' => true, 'value' => $value] : ['ok' => false, 'value' => null];
    }

    public static function isValid(string $value): bool
    {
        return preg_match(self::PATTERN, $value) === 1;
    }

    public static function invalidMessage(): string
    {
        return 'external_id must be 1-' . self::MAX_LENGTH . ' characters: letters, digits, dot, underscore, colon, @ or dash';
    }

    /**
     * Serialise "is this external ID free? then claim it" across requests, so two
     * billing retries arriving together cannot both pass the check.
     */
    public static function lock(string $scope, string $externalId, int $timeoutSeconds = 10): bool
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT GET_LOCK(:name, :timeout)');
        $stmt->execute(['name' => self::lockName($scope, $externalId), 'timeout' => $timeoutSeconds]);

        return (int) $stmt->fetchColumn() === 1;
    }

    public static function unlock(string $scope, string $externalId): void
    {
        try {
            $stmt = Database::getPdoConnection()->prepare('SELECT RELEASE_LOCK(:name)');
            $stmt->execute(['name' => self::lockName($scope, $externalId)]);
        } catch (\Throwable) {
            // The lock also ends with the connection.
        }
    }

    /**
     * True when a write failed on a unique index (another row holds the value).
     */
    public static function isDuplicateKey(\Throwable $e): bool
    {
        return $e instanceof \PDOException && ((int) ($e->errorInfo[1] ?? 0) === 1062 || (string) $e->getCode() === '23000');
    }

    public static function lockedMessage(): string
    {
        return 'Another request is using this external_id right now. Try again.';
    }

    private static function lockName(string $scope, string $externalId): string
    {
        return 'fp_external_id:' . $scope . ':' . sha1($externalId);
    }
}
