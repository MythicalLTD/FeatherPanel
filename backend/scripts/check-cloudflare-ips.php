<?php

declare(strict_types=1);

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

declare(strict_types=1);

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

/*
 * Maintainer tool: compare the hardcoded Cloudflare ranges in
 * App\CloudFlare\CloudFlareRealIP with the lists Cloudflare publishes.
 *
 * Usage (from backend/):
 *   php scripts/check-cloudflare-ips.php
 *
 * Exit codes: 0 = in sync, 1 = the lists differ, 2 = the published lists could not be fetched.
 * Only this script talks to the network; the panel itself never fetches these lists at runtime.
 */

require __DIR__ . '/../storage/packages/autoload.php';

use App\CloudFlare\CloudFlareRealIP;

const CLOUDFLARE_LISTS = [
    'https://www.cloudflare.com/ips-v4',
    'https://www.cloudflare.com/ips-v6',
];

/**
 * @return list<string>|null
 */
function fetchRanges(string $url): ?array
{
    $context = stream_context_create([
        'http' => [
            'timeout' => 15,
            'user_agent' => 'FeatherPanel check-cloudflare-ips',
        ],
    ]);
    $body = @file_get_contents($url, false, $context);
    if ($body === false) {
        return null;
    }
    $lines = preg_split('/\R/', $body) ?: [];

    return array_values(array_filter(array_map(static fn (string $line) => strtolower(trim($line)), $lines), static fn (string $line) => $line !== ''));
}

$property = new ReflectionProperty(CloudFlareRealIP::class, 'cloudflareRanges');
/** @var list<string> $hardcoded */
$hardcoded = array_map(static fn (string $range) => strtolower(trim($range)), $property->getValue());

$published = [];
foreach (CLOUDFLARE_LISTS as $url) {
    $ranges = fetchRanges($url);
    if ($ranges === null || $ranges === []) {
        fwrite(STDERR, "Could not fetch {$url}\n");
        exit(2);
    }
    $published = array_merge($published, $ranges);
}

$added = array_values(array_diff($published, $hardcoded));
$removed = array_values(array_diff($hardcoded, $published));

if ($added === [] && $removed === []) {
    echo 'Cloudflare ranges are in sync (' . count($published) . " ranges).\n";
    exit(0);
}

echo "Cloudflare ranges differ from CloudFlareRealIP::\$cloudflareRanges.\n";
foreach ($added as $range) {
    echo "  + {$range}  (published by Cloudflare, missing in the panel)\n";
}
foreach ($removed as $range) {
    echo "  - {$range}  (in the panel, no longer published by Cloudflare)\n";
}
exit(1);
