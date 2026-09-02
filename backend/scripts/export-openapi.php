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

if (!defined('APP_VERSION')) {
    define('APP_VERSION', 'v1.4.0');
}

require __DIR__ . '/../storage/packages/autoload.php';

$outputPath = $argv[1] ?? (__DIR__ . '/../openapi.json');
$controllersDir = realpath(__DIR__ . '/../app/Controllers');

if ($controllersDir === false) {
    fwrite(STDERR, "Unable to locate backend/app/Controllers\n");
    exit(1);
}

$previousReporting = error_reporting(E_ERROR);
ob_start();

try {
    $openapi = OpenApi\Generator::scan([$controllersDir]);
    ob_end_clean();
    error_reporting($previousReporting);

    $json = $openapi->toJson();
    if ($json === '' || $json === '{}') {
        throw new RuntimeException('OpenAPI generator returned an empty document');
    }

    file_put_contents($outputPath, $json);

    $decoded = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
    $pathCount = is_array($decoded['paths'] ?? null) ? count($decoded['paths']) : 0;

    fwrite(STDOUT, "Wrote OpenAPI spec to {$outputPath} ({$pathCount} paths)\n");
} catch (Throwable $exception) {
    ob_end_clean();
    error_reporting($previousReporting);
    fwrite(STDERR, 'Failed to export OpenAPI spec: ' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
