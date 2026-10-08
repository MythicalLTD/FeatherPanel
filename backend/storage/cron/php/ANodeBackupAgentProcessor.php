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
use App\Chat\NodeBackupPolicy;
use App\Cli\Utils\MinecraftColorCodeSupport;
use App\Services\NodeBackup\NodeBackupAgentRunner;

/**
 * Processes due Wings node backup policies every minute.
 */
class ANodeBackupAgentProcessor implements TimeTask
{
    public function run()
    {
        $cron = new Cron('node-backup-agent-processor', '1M');
        $force = getenv('FP_CRON_FORCE') === '1';
        try {
            $cron->runIfDue(function () {
                $this->processPolicies();
                TimedTask::markRun('node-backup-agent-processor', true, 'Processed node backup policies heartbeat');
            }, $force);
        } catch (\Exception $e) {
            $app = App::getInstance(false, true);
            $app->getLogger()->error('Failed to process node backup policies: ' . $e->getMessage());
            TimedTask::markRun('node-backup-agent-processor', false, $e->getMessage());
        }
    }

    private function processPolicies(): void
    {
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing Wings node backup policies...');

        $stuckReset = NodeBackupPolicy::resetStuckProcessing(120);
        if ($stuckReset > 0) {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&eReset ' . $stuckReset . ' node backup polic(ies) stuck in processing');
        }

        $due = NodeBackupPolicy::getDuePolicies();
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aFound ' . count($due) . ' due node backup policies');

        $runner = new NodeBackupAgentRunner();
        foreach ($due as $policy) {
            try {
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aRunning node backup policy: ' . ($policy['name'] ?? $policy['id']));
                $result = $runner->run($policy);
                MinecraftColorCodeSupport::sendOutputWithNewLine(
                    '&aNode backup policy finished with status ' . ($result['status'] ?? 'unknown')
                );
            } catch (\Throwable $e) {
                App::getInstance(false, true)->getLogger()->error(
                    'Failed to process node backup policy ' . ($policy['id'] ?? '?') . ': ' . $e->getMessage()
                );
                MinecraftColorCodeSupport::sendOutputWithNewLine(
                    '&cFailed to process node backup policy ' . ($policy['name'] ?? '') . ': ' . $e->getMessage()
                );
                if (isset($policy['id'])) {
                    NodeBackupPolicy::updatePolicy((int) $policy['id'], ['is_processing' => 0]);
                }
            }
        }
    }
}
