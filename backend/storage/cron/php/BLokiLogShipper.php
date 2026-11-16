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
use App\Observability\LokiShipper;
use App\Cli\Utils\MinecraftColorCodeSupport;

/**
 * BLokiLogShipper - pushes queued structured log lines to Grafana Loki once a minute
 * (Admin > Observability > Loki push). A failed push keeps the lines queued for the
 * next run; nothing is sent while the Loki push is disabled.
 */
class BLokiLogShipper implements TimeTask
{
    public function run()
    {
        $cron = new Cron('loki-log-shipper', '1M');
        $force = getenv('FP_CRON_FORCE') === '1';
        try {
            $cron->runIfDue(function () {
                $result = LokiShipper::drain();
                if ($result['skipped']) {
                    return;
                }
                if ($result['failed']) {
                    MinecraftColorCodeSupport::sendOutputWithNewLine('&cLokiLogShipper: push failed after ' . $result['pushed'] . ' line(s): ' . $result['error']);

                    return;
                }
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aLokiLogShipper: pushed ' . $result['pushed'] . ' line(s)');
            }, $force);
        } catch (\Throwable $e) {
            App::getInstance(false, true)->getLogger()->warning('Failed to push logs to Loki: ' . $e->getMessage());
        }
    }
}
