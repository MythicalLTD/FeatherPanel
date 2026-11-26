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
}
