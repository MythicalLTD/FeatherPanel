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
use App\Chat\BackupPolicy;
use App\Services\Backup\BackupPolicyRunner;
use App\Cli\Utils\MinecraftColorCodeSupport;
use App\Plugins\Events\Events\BackupPolicyEvent;

/**
 * Processes due admin backup policies every minute.
 */
class AAdminBackupPolicyProcessor implements TimeTask
{
    public function run()
    {
        $cron = new Cron('admin-backup-policy-processor', '1M');
        $force = getenv('FP_CRON_FORCE') === '1';
        try {
            $cron->runIfDue(function () {
                $this->processPolicies();
                TimedTask::markRun('admin-backup-policy-processor', true, 'Processed admin backup policies heartbeat');
            }, $force);
        } catch (\Exception $e) {
            $app = App::getInstance(false, true);
            $app->getLogger()->error('Failed to process admin backup policies: ' . $e->getMessage());
            TimedTask::markRun('admin-backup-policy-processor', false, $e->getMessage());
        }
    }

    private function processPolicies(): void
    {
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing admin backup policies...');

        $stuckReset = BackupPolicy::resetStuckProcessing(30);
        if ($stuckReset > 0) {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&eReset ' . $stuckReset . ' backup policy(ies) stuck in processing');
        }

        $due = BackupPolicy::getDuePolicies();
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aFound ' . count($due) . ' due backup policies');

        foreach ($due as $policy) {
            try {
                $this->processPolicy($policy);
            } catch (\Throwable $e) {
                App::getInstance(false, true)->getLogger()->error(
                    'Failed to process backup policy ' . ($policy['id'] ?? '?') . ': ' . $e->getMessage()
                );
                MinecraftColorCodeSupport::sendOutputWithNewLine(
                    '&cFailed to process backup policy ' . ($policy['name'] ?? '') . ': ' . $e->getMessage()
                );
                if (isset($policy['id'])) {
                    BackupPolicy::updatePolicy((int) $policy['id'], ['is_processing' => 0]);
                }
            }
        }
    }

    /**
     * @param array<string, mixed> $policy
     */
    private function processPolicy(array $policy): void
    {
        $policyId = (int) $policy['id'];
        MinecraftColorCodeSupport::sendOutputWithNewLine(
            '&aProcessing backup policy: ' . $policy['name'] . ' (ID: ' . $policyId . ')'
        );

        if (!BackupPolicy::updatePolicy($policyId, ['is_processing' => 1])) {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to mark backup policy as processing: ' . $policyId);

            return;
        }

        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(BackupPolicyEvent::onBackupPolicyRunStarted(), [
                'policy' => $policy,
            ]);
        }

        $result = (new BackupPolicyRunner())->run($policy);

        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(BackupPolicyEvent::onBackupPolicyRunCompleted(), [
                'policy' => $policy,
                'result' => $result,
            ]);
        }

        MinecraftColorCodeSupport::sendOutputWithNewLine(
            '&aBackup policy finished: ' . $policy['name']
            . ' (ok=' . $result['servers_ok']
            . ', failed=' . $result['servers_failed']
            . ', skipped=' . $result['servers_skipped'] . ')'
        );
    }
}
