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

use RateLimit\Rate;

/**
 * Rate limiter for installations without a reachable Redis.
 *
 * Behaviour matches nikolaposa/rate-limit's RedisRateLimiter for the cases the
 * panel uses (fixed window per identifier, one shared counter per namespace):
 * every hit counts, the window is the rate's interval and the limit is the
 * rate's operation count. Callers get a plain boolean, so the middleware does
 * not depend on the limiter package's exception type.
 */
class FileRateLimiter
{
    public function __construct(
        private readonly Rate $rate,
        private readonly string $namespace = 'rate_limit',
    ) {
    }

    /**
     * Register one hit for the identifier.
     *
     * @return bool True when the request is within the limit, false when it
     *              should be rejected (caller answers HTTP 429).
     */
    public function limit(string $identifier): bool
    {
        if (!FileCounterStore::available()) {
            // Same as before this fix: without a counter store we cannot
            // decide, so we do not block.
            return true;
        }

        $key = 'ratelimit:' . $this->namespace . ':' . $identifier;
        $count = FileCounterStore::increment($key, $this->rate->getInterval());

        return $count <= $this->rate->getOperations();
    }
}
