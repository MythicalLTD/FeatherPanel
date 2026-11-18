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

namespace App\Services\Dns\Providers;

/**
 * A DNS provider answered a write with HTTP 429. Nothing was changed. The caller waits $seconds, reads the zone
 * again and decides again, instead of repeating a write that was based on an out-of-date read.
 */
final class DnsRateLimited extends \RuntimeException
{
    public function __construct(public readonly int $seconds, string $message)
    {
        parent::__construct($message);
    }
}
