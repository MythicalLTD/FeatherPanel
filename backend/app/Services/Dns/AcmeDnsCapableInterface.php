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

namespace App\Services\Dns;

interface AcmeDnsCapableInterface
{
    /**
     * @return array{ok: bool, action?: string, record?: array<string, mixed>, error?: string}
     */
    public function createTxtRecord(string $zoneId, string $name, string $content, int $ttl = 120): array;

    /**
     * @return array{ok: bool, deleted: int, error?: string}
     */
    public function deleteTxtRecords(string $zoneId, string $name, ?string $content = null): array;
}
