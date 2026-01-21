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

use App\Chat\TimedTask;

class UpdateEnv implements TimeTask
{
    public function run()
    {	
        $cron = new Cron('update-env', '1H');
        $force = getenv('FP_CRON_FORCE') === '1';
        try {
            $cron->runIfDue(function () {
                // Heartbeat
                TimedTask::markRun('update-env', true, 'UpdateEnv heartbeat');
            }, $force);
        } catch (\Exception $e) {
            $app = \App\App::getInstance(false, true);
            $app->getLogger()->error('Failed to update env values: ' . $e->getMessage());
            TimedTask::markRun('update-env', false, $e->getMessage());
        }
    }
}
