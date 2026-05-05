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
 * CheckExpiredServers - Cron task for automatically suspending expired servers and VMs.
 *
 * This cron job runs every 5 minutes and handles:
 * - Suspending game servers that have reached their expiry date
 * - Suspending VM instances that have reached their expiry date
 */

use App\App;
use App\Chat\Server;
use App\Chat\Database;
use App\Chat\VmInstance;
use App\Cli\Utils\MinecraftColorCodeSupport;

class ZCheckExpiredServers implements TimeTask
{
    /**
     * Entry point for the cron CheckExpiredServers.
     */
    public function run()
    {
        $cron = new Cron('check-expired-servers', '5M');
        $force = true;
        try {
            $cron->runIfDue(function () {
                $this->processTask();
            }, $force);
        } catch (\Exception $e) {
            $app = App::getInstance(false, true);
            $app->getLogger()->error('Failed to process CheckExpiredServers: ' . $e->getMessage());
        }
    }

    /**
     * Process the main task logic.
     */
    private function processTask()
    {
        $app = App::getInstance(false, true);
        $logger = $app->getLogger();
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing CheckExpiredServers...');

        $suspendedServers = 0;
        $suspendedVms = 0;

        // Check and suspend expired game servers
        try {
            $suspendedServers = $this->checkExpiredGameServers();
            if ($suspendedServers > 0) {
                $logger->info('Suspended ' . $suspendedServers . ' expired game server(s)');
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aSuspended ' . $suspendedServers . ' expired game server(s)');
            }
        } catch (\Exception $e) {
            $logger->error('Failed to check expired game servers: ' . $e->getMessage());
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to check expired game servers: ' . $e->getMessage());
        }

        // Check and suspend expired VM instances
        try {
            $suspendedVms = $this->checkExpiredVmInstances();
            if ($suspendedVms > 0) {
                $logger->info('Suspended ' . $suspendedVms . ' expired VM instance(s)');
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aSuspended ' . $suspendedVms . ' expired VM instance(s)');
            }
        } catch (\Exception $e) {
            $logger->error('Failed to check expired VM instances: ' . $e->getMessage());
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to check expired VM instances: ' . $e->getMessage());
        }

        if ($suspendedServers === 0 && $suspendedVms === 0) {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&7No expired servers or VMs found');
        }

        MinecraftColorCodeSupport::sendOutputWithNewLine('&aCheckExpiredServers completed successfully');
    }

    /**
     * Check and suspend expired game servers.
     *
     * @return int Number of servers suspended
     */
    private function checkExpiredGameServers(): int
    {
        $pdo = Database::getPdoConnection();
        $logger = App::getInstance(false, true)->getLogger();

        // Find servers that have expired and are not already suspended
        $stmt = $pdo->prepare('
            SELECT id, uuid, name, owner_id, expires_at
            FROM featherpanel_servers
            WHERE expires_at IS NOT NULL
              AND expires_at <= NOW()
              AND suspended = 0
        ');
        $stmt->execute();
        $expiredServers = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $suspendedCount = 0;

        foreach ($expiredServers as $server) {
            try {
                // Suspend the server
                $success = Server::updateServerById((int) $server['id'], ['suspended' => 1]);

                if ($success) {
                    ++$suspendedCount;
                    $logger->info('Auto-suspended expired server: ' . $server['name'] . ' (ID: ' . $server['id'] . ', Expired: ' . $server['expires_at'] . ')');
                } else {
                    $logger->error('Failed to suspend expired server: ' . $server['name'] . ' (ID: ' . $server['id'] . ')');
                }
            } catch (\Exception $e) {
                $logger->error('Error suspending server ' . $server['name'] . ' (ID: ' . $server['id'] . '): ' . $e->getMessage());
            }
        }

        return $suspendedCount;
    }

    /**
     * Check and suspend expired VM instances.
     *
     * @return int Number of VMs suspended
     */
    private function checkExpiredVmInstances(): int
    {
        $pdo = Database::getPdoConnection();
        $logger = App::getInstance(false, true)->getLogger();

        // Find VM instances that have expired and are not already suspended
        $stmt = $pdo->prepare('
            SELECT id, vmid, hostname, user_uuid, expires_at
            FROM featherpanel_vm_instances
            WHERE expires_at IS NOT NULL
              AND expires_at <= NOW()
              AND suspended = 0
        ');
        $stmt->execute();
        $expiredVms = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $suspendedCount = 0;

        foreach ($expiredVms as $vm) {
            try {
                // Suspend the VM instance
                $success = VmInstance::update((int) $vm['id'], ['suspended' => 1]);

                if ($success) {
                    ++$suspendedCount;
                    $logger->info('Auto-suspended expired VM: ' . ($vm['hostname'] ?? 'VM-' . $vm['vmid']) . ' (ID: ' . $vm['id'] . ', Expired: ' . $vm['expires_at'] . ')');
                } else {
                    $logger->error('Failed to suspend expired VM: ' . ($vm['hostname'] ?? 'VM-' . $vm['vmid']) . ' (ID: ' . $vm['id'] . ')');
                }
            } catch (\Exception $e) {
                $logger->error('Error suspending VM ' . ($vm['hostname'] ?? 'VM-' . $vm['vmid']) . ' (ID: ' . $vm['id'] . '): ' . $e->getMessage());
            }
        }

        return $suspendedCount;
    }
}
