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

namespace App\Cron;

use App\Chat\Database;
use App\Telemetry\UmamiTelemetry;
use App\Telemetry\UmamiTelemetryState;
use App\Cli\Utils\MinecraftColorCodeSupport;

final class UmamiTelemetryReporter implements TimeTask
{
    public function run(): void
    {
        try {
            UmamiTelemetry::runScheduled(
                new UmamiTelemetryState(Database::getPdoConnection()),
                static fn () => UmamiTelemetry::fromApp(),
            );
        } catch (\Throwable $e) {
            // Best effort even when the database is unavailable or migration is pending.
            MinecraftColorCodeSupport::sendOutputWithNewLine(
                '&7Failed to send telemtry: ' . $e->getMessage(),
            );
        }
    }
}
