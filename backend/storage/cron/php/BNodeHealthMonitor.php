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

use App\App;
use App\Cli\Utils\MinecraftColorCodeSupport;
use App\Services\NodeAlerts\NodeAlertService;

/**
 * BNodeHealthMonitor - probes every node once a minute, stores the last known health
 * (status page heartbeat) and raises or resolves node alerts (down, disk, failed backups).
 */
class BNodeHealthMonitor implements TimeTask
{
    public function run()
    {
        $cron = new Cron('node-health-monitor', '1M');
        $force = getenv('FP_CRON_FORCE') === '1';
        try {
            $cron->runIfDue(function () {
                $stats = (new NodeAlertService())->evaluate();
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aNodeHealthMonitor: ' . $stats['nodes'] . ' node(s), raised ' . $stats['raised'] . ', resolved ' . $stats['resolved'] . ', notified ' . $stats['notified']);
            }, $force);
        } catch (\Throwable $e) {
            App::getInstance(false, true)->getLogger()->error('Failed to process NodeHealthMonitor: ' . $e->getMessage());
        }
    }
}
