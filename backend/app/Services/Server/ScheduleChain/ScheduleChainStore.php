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

/**
 * Storage used by {@see ScheduleChainRunner}. The real one is the
 * `featherpanel_server_schedules` table; tests use an in-memory one.
 */
interface ScheduleChainStore
{
    /**
     * Atomically take the tick lease on a schedule.
     *
     * The lease is only granted when nobody else holds a live one and the
     * schedule is still due (a new run, or a running chain whose next task is
     * due). Returns the fresh schedule row on success, null otherwise.
     *
     * @param int $now Unix time (UTC)
     * @param int $leaseUntil Unix time the lease expires
     */
    public function claim(int $scheduleId, int $now, int $leaseUntil): ?array;

    /**
     * Write schedule columns. Times are `Y-m-d H:i:s` UTC strings or null.
     *
     * @param array<string, int|string|null> $fields
     */
    public function save(int $scheduleId, array $fields): void;
}
