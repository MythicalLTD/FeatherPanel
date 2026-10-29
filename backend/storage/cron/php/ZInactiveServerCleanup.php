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

/**
 * Inactive server cleanup: warns owners of servers nobody used for the configured number of days
 * and, after the grace period, runs the configured action. Off unless an admin turned it on;
 * suspend, archive and delete also need that action to be confirmed in the admin UI.
 */

use App\App;
use App\Chat\TimedTask;
use App\Cli\Utils\MinecraftColorCodeSupport;
use App\Services\InactiveCleanup\InactiveCleanupPolicy;
use App\Services\InactiveCleanup\InactiveCleanupService;

class ZInactiveServerCleanup implements TimeTask
{
    public function run()
    {
        $cron = new Cron('inactive-server-cleanup', '1H');
        $force = getenv('FP_CRON_FORCE') === '1';
        try {
            $cron->runIfDue(function () {
                $policy = InactiveCleanupPolicy::get();
                if (!$policy['enabled']) {
                    TimedTask::markRun('inactive-server-cleanup', true, 'Inactive server cleanup is off');

                    return;
                }
                $service = new InactiveCleanupService($policy);
                $result = $service->execute($service->plan(), InactiveCleanupPolicy::actionArmed($policy));
                $summary = json_encode($result['applied']) . ', failed ' . $result['failed'] . ', deferred ' . $result['deferred'];
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aInactive server cleanup: ' . $summary);
                TimedTask::markRun('inactive-server-cleanup', $result['failed'] === 0, 'Inactive cleanup ' . $summary);
            }, $force);
        } catch (\Throwable $e) {
            App::getInstance(false, true)->getLogger()->error('Inactive server cleanup failed: ' . $e->getMessage());
            TimedTask::markRun('inactive-server-cleanup', false, $e->getMessage());
        }
    }
}
