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

namespace App\Services\Server;

class LifecycleHookPowerGate
{
    public static function isBlocked(array $hookResult): bool
    {
        return ($hookResult['blocked'] ?? false) === true;
    }

    public static function blockedReason(array $hookResult): string
    {
        $reason = trim((string) ($hookResult['blocked_reason'] ?? ''));

        return $reason !== '' ? $reason : 'unknown';
    }

    public static function apiErrorMessage(array $hookResult): string
    {
        return 'Power action blocked by lifecycle hook: ' . self::blockedReason($hookResult);
    }

    public static function scheduleExceptionMessage(array $hookResult): string
    {
        return 'Lifecycle hook blocked action: ' . self::blockedReason($hookResult);
    }

    public static function chatbotErrorMessage(array $hookResult): string
    {
        return self::apiErrorMessage($hookResult);
    }
}
