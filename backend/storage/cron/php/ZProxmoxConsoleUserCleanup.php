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
 * ProxmoxConsoleUserCleanup - Removes expired fp-console-* Proxmox users.
 *
 * FeatherPanel creates short-lived Proxmox users for VNC console access. Proxmox
 * does not remove users when their expire date passes, so this job deletes them.
 *
 * Schedule: every hour.
 */

use App\App;
use App\Chat\TimedTask;
use App\Chat\VmNode;
use App\Cli\Utils\MinecraftColorCodeSupport;
use App\Services\Vm\VmInstanceUtil;

class ZProxmoxConsoleUserCleanup implements TimeTask
{
    private const TASK_NAME = 'proxmox-console-user-cleanup';

    /**
     * Entry point for the cron ProxmoxConsoleUserCleanup.
     */
    public function run()
    {
        $cron = new Cron(self::TASK_NAME, '1H');
        $force = true;
        try {
            $cron->runIfDue(function () {
                $this->processTask();
            }, $force);
        } catch (\Exception $e) {
            $app = App::getInstance(false, true);
            $app->getLogger()->error('Failed to process ProxmoxConsoleUserCleanup: ' . $e->getMessage());
            TimedTask::markRun(self::TASK_NAME, false, $e->getMessage());
        }
    }

    /**
     * Process the main task logic.
     */
    private function processTask()
    {
        $app = App::getInstance(false, true);
        $logger = $app->getLogger();
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing Proxmox console user cleanup...');

        $nodes = VmNode::getAllVmNodes();
        if ($nodes === []) {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&7No VM nodes configured, nothing to clean.');
            TimedTask::markRun(self::TASK_NAME, true, 'No VM nodes');

            return;
        }

        $totalDeleted = 0;
        $totalErrors = 0;

        foreach ($nodes as $vmNode) {
            $nodeLabel = ($vmNode['name'] ?? '') !== ''
                ? (string) $vmNode['name']
                : ('#' . ($vmNode['id'] ?? '?'));

            try {
                $result = VmInstanceUtil::cleanupExpiredFpConsoleUsersOnNode($vmNode);
                $totalDeleted += $result['deleted'];
                $totalErrors += $result['errors'];

                if ($result['deleted'] > 0) {
                    MinecraftColorCodeSupport::sendOutputWithNewLine(
                        '&aNode ' . $nodeLabel . ': removed ' . $result['deleted'] . ' expired console user(s)'
                    );
                }
            } catch (\Throwable $e) {
                ++$totalErrors;
                $logger->error(
                    'Proxmox console user cleanup failed for node ' . $nodeLabel . ': ' . $e->getMessage()
                );
                MinecraftColorCodeSupport::sendOutputWithNewLine(
                    '&cNode ' . $nodeLabel . ': cleanup failed: ' . $e->getMessage()
                );
            }
        }

        if ($totalDeleted > 0) {
            $logger->info('Proxmox console user cleanup removed ' . $totalDeleted . ' expired user(s)');
        }

        $summary = $totalDeleted . ' user(s) removed';
        if ($totalErrors > 0) {
            $summary .= ', ' . $totalErrors . ' error(s)';
        }

        MinecraftColorCodeSupport::sendOutputWithNewLine('&aProxmox console user cleanup completed (' . $summary . ')');
        TimedTask::markRun(self::TASK_NAME, $totalErrors === 0, $summary);
    }
}
