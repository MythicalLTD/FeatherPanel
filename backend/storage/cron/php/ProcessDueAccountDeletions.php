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
use App\Services\User\UserDeletionService;
use App\Cli\Utils\MinecraftColorCodeSupport;

/**
 * ProcessDueAccountDeletions - Purge accounts scheduled for delayed or after-services deletion.
 *
 * Schedule: every 5 minutes
 */
class ProcessDueAccountDeletions implements TimeTask
{
    public function run()
    {
        $cron = new Cron('process-due-account-deletions', '5M');
        $force = getenv('FP_CRON_FORCE') === '1';
        try {
            $cron->runIfDue(function () {
                $this->processTask();
                TimedTask::markRun('process-due-account-deletions', true, 'Processed due account deletions');
            }, $force);
        } catch (\Exception $e) {
            $app = App::getInstance(false, true);
            $app->getLogger()->error('Failed to process due account deletions: ' . $e->getMessage());
            TimedTask::markRun('process-due-account-deletions', false, $e->getMessage());
        }
    }

    private function processTask()
    {
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing due account deletions...');
        $processed = UserDeletionService::processDueDeletions();
        if ($processed > 0) {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&aHard-deleted ' . $processed . ' account(s)');
            App::getInstance(false, true)->getLogger()->info('Hard-deleted ' . $processed . ' scheduled account(s)');
        } else {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&7No due account deletions');
        }
    }
}
