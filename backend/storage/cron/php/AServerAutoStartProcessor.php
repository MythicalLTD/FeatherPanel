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
use App\Chat\TimedTask;
use App\Cli\Utils\MinecraftColorCodeSupport;
use App\Services\Server\ServerAutoStartService;

/**
 * Processes staggered server auto-starts queued after node reconnect.
 */
class AServerAutoStartProcessor implements TimeTask
{
    public function run()
    {
        $cron = new Cron('server-auto-start-processor', '1M');
        $force = getenv('FP_CRON_FORCE') === '1';
        try {
            $cron->runIfDue(function () {
                $service = new ServerAutoStartService();
                $stats = $service->processDueJobs(25);
                TimedTask::markRun(
                    'server-auto-start-processor',
                    true,
                    sprintf(
                        'processed=%d started=%d skipped=%d failed=%d',
                        $stats['processed'],
                        $stats['started'],
                        $stats['skipped'],
                        $stats['failed']
                    )
                );

                if ($stats['processed'] > 0) {
                    MinecraftColorCodeSupport::sendOutputWithNewLine(
                        '&aAuto-start: processed ' . $stats['processed']
                        . ' (started ' . $stats['started']
                        . ', skipped ' . $stats['skipped']
                        . ', failed ' . $stats['failed'] . ')'
                    );
                }
            }, $force);
        } catch (\Exception $e) {
            $app = App::getInstance(false, true);
            $app->getLogger()->error('Failed to process server auto-starts: ' . $e->getMessage());
            TimedTask::markRun('server-auto-start-processor', false, $e->getMessage());
        }
    }
}
