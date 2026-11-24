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

namespace App\Services\Server\ScheduleChain;

use App\Chat\ServerSchedule;

/**
 * {@see ScheduleChainStore} backed by the server schedules table.
 */
final class DatabaseScheduleChainStore implements ScheduleChainStore
{
    public function claim(int $scheduleId, int $now, int $leaseUntil): ?array
    {
        return ServerSchedule::claimForTick($scheduleId, $now, $leaseUntil);
    }

    public function save(int $scheduleId, array $fields): void
    {
        if (!ServerSchedule::updateSchedule($scheduleId, $fields)) {
            throw new \RuntimeException('Failed to save schedule ' . $scheduleId . ' state');
        }
    }
}
