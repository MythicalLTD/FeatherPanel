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

/**
 * DNS providers that can write the record types needed for mail (MX, TXT) next to the A record.
 *
 * Every method answers with ['ok' => bool, 'action' => string, 'error' => ?string, ...]. The action is one of
 * created, updated, unchanged, conflict (an existing different record was kept) or would_create / would_update
 * (dry run).
 */
interface MailRecordCapableInterface
{
    /**
     * @return array<string, mixed>
     */
    public function upsertMxRecord(string $zoneId, string $name, string $target, int $priority = 10, int $ttl = 300, bool $overwrite = true): array;

    /**
     * Adds or replaces one TXT value (SPF, DKIM, DMARC, ...) and keeps every other TXT value on the same name.
     * An existing value with the same "v=" tag is only replaced when $overwrite is true.
     *
     * @return array<string, mixed>
     */
    public function upsertTxtRecord(string $zoneId, string $name, string $content, int $ttl = 300, bool $overwrite = true): array;
}
