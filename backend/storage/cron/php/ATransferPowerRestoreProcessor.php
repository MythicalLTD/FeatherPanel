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
use App\Services\Servers\TransferPowerRestorer;

/**
 * Retries starting servers that were running before a transfer, when the
 * start right after the transfer did not go through.
 */
class ATransferPowerRestoreProcessor implements TimeTask
{
    public function run()
    {
        $cron = new Cron('transfer-power-restore', '1M');
        $force = getenv('FP_CRON_FORCE') === '1';
        try {
            $cron->runIfDue(function () {
                $stats = TransferPowerRestorer::processPending(25);
                TimedTask::markRun(
                    'transfer-power-restore',
                    true,
                    sprintf('processed=%d started=%d failed=%d', $stats['processed'], $stats['started'], $stats['failed'])
                );
                if ($stats['processed'] > 0) {
                    MinecraftColorCodeSupport::sendOutputWithNewLine(
                        '&aTransfer power restore: processed ' . $stats['processed']
                        . ' (started ' . $stats['started'] . ', failed ' . $stats['failed'] . ')'
                    );
                }
            }, $force);
        } catch (\Exception $e) {
            App::getInstance(false, true)->getLogger()->error('Failed to process transfer power restores: ' . $e->getMessage());
            TimedTask::markRun('transfer-power-restore', false, $e->getMessage());
        }
    }
}
