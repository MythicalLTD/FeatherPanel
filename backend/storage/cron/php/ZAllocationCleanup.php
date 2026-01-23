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
 * AllocationCleanup - Cron task for cleaning up orphaned allocations.
 *
 * This cron job runs every day (24 hours) and handles:
 * - Unassigning allocations that point to non-existent servers
 */

use App\App;
use App\Chat\Allocation;
use App\Cli\Utils\MinecraftColorCodeSupport;

class ZAllocationCleanup implements TimeTask
{
    /**
     * Entry point for the cron AllocationCleanup.
     */
    public function run()
    {
        $cron = new Cron('allocation-cleanup', '1D');
        $force = getenv('FP_CRON_FORCE') === '1';
        try {
            $cron->runIfDue(function () {
                $this->processTask();
            }, $force);
        } catch (\Exception $e) {
            $app = App::getInstance(false, true);
            $app->getLogger()->error('Failed to process AllocationCleanup: ' . $e->getMessage());
        }
    }

    /**
     * Process the main task logic.
     */
    private function processTask()
    {
        $app = App::getInstance(false, true);
        $logger = $app->getLogger();
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing AllocationCleanup...');

        // Clean up orphaned allocations
        try {
            $cleanedCount = Allocation::cleanupOrphans();
            if ($cleanedCount > 0) {
                $logger->info('Cleaned up ' . $cleanedCount . ' orphaned allocation(s)');
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aCleaned up ' . $cleanedCount . ' orphaned allocation(s)');
            } else {
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aNo orphaned allocations found.');
            }
        } catch (\Exception $e) {
            $logger->error('Failed to cleanup orphaned allocations: ' . $e->getMessage());
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to cleanup orphaned allocations: ' . $e->getMessage());
        }

        MinecraftColorCodeSupport::sendOutputWithNewLine('&aAllocationCleanup completed successfully');
    }
}
