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
 * Emit WebSpace plugin events with a consistent payload shape.
 */
class WebSpacePluginEvents
{
    /**
     * @param array<string, mixed> $payload
     */
    public static function emit(string $eventName, array $payload): void
    {
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit($eventName, $payload);
        }
    }

    /**
     * @param array<string, mixed> $space
     * @param array<string, mixed> $extra
     *
     * @return array<string, mixed>
     */
    public static function basePayload(?string $userUuid, array $space, array $extra = []): array
    {
        return array_merge([
            'user_uuid' => $userUuid,
            'webspace_uuid' => (string) ($space['uuid'] ?? ''),
            'webspace_uuid_short' => (string) ($space['uuidShort'] ?? ''),
            'webspace' => $space,
        ], $extra);
    }
}
