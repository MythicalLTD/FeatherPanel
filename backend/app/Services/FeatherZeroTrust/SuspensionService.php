<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Services\FeatherZeroTrust;

use App\App;
use App\Chat\Node;
use App\Chat\User;
use App\Chat\Server;
use App\Services\Wings\Wings;
use App\Config\ConfigInterface;
use App\Mail\templates\ServerBanned;
use App\Plugins\Events\Events\ServerEvent;

/**
 * Suspension Service for FeatherZeroTrust.
 *
 * Handles automatic server suspension when detections are found.
 */
class SuspensionService
{
    /**
     * Suspend a server if auto-suspend is enabled and detections are found.
     *
     * @param string $serverUuid Server UUID
     * @param int $detectionsCount Number of detections found
     * @param Configuration $config Configuration instance
     *
     * @return bool True if server was suspended, false otherwise
     */
    public static function suspendIfNeeded(string $serverUuid, int $detectionsCount, Configuration $config): bool
    {
        $configData = $config->getAll();

        // Check if auto-suspend is enabled and there are detections
        if (!$configData['auto_suspend'] || $detectionsCount === 0) {
            return false;
        }

        try {
            // Get server information
            $server = Server::getServerByUuid($serverUuid);

            if (!$server) {
                App::getInstance(true)->getLogger()->warning("FeatherZeroTrust: Server not found for UUID: {$serverUuid}");

                return false;
            }

            // Check if server is already suspended
            if ($server['suspended'] == 1) {
                App::getInstance(true)->getLogger()->info("FeatherZeroTrust: Server {$serverUuid} is already suspended");

                return false;
            }

            // Get node information
            $node = Node::getNodeById($server['node_id']);

            if (!$node) {
                App::getInstance(true)->getLogger()->warning("FeatherZeroTrust: Node not found for server: {$serverUuid}");

                return false;
            }

            // Update server status to suspended
            $updated = Server::updateServerById($server['id'], ['suspended' => 1]);

            if (!$updated) {
                App::getInstance(true)->getLogger()->error("FeatherZeroTrust: Failed to suspend server {$serverUuid} in database");

                return false;
            }

            // Kill server in Wings
            $wings = new Wings(
                $node['fqdn'],
                $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30
            );

            $response = $wings->getServer()->killServer($serverUuid);

            if (!$response->isSuccessful()) {
                App::getInstance(true)->getLogger()->warning("FeatherZeroTrust: Failed to kill server {$serverUuid} in Wings: " . $response->getError());
                // Server is already marked as suspended in DB, so we consider it successful
            }

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerEvent::onServerSuspended(),
                    [
                        'server' => $server,
                        'suspended_by' => [
                            'uuid' => 'system',
                            'username' => 'FeatherZeroTrust',
                            'email' => 'system@featherpanel',
                        ],
                    ]
                );
            }

            // Send email notification to server owner
            $config = App::getInstance(true)->getConfig();
            $user = User::getUserById($server['owner_id']);

            if ($user) {
                try {
                    ServerBanned::send([
                        'email' => $user['email'],
                        'subject' => 'Server suspended on ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                        'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                        'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'),
                        'first_name' => $user['first_name'],
                        'last_name' => $user['last_name'],
                        'username' => $user['username'],
                        'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
                        'uuid' => $user['uuid'],
                        'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
                        'server_name' => $server['name'],
                    ]);
                } catch (\Exception $e) {
                    App::getInstance(true)->getLogger()->error('FeatherZeroTrust: Failed to send server suspended email: ' . $e->getMessage());
                }
            }

            App::getInstance(true)->getLogger()->warning("FeatherZeroTrust: Automatically suspended server {$serverUuid} ({$server['name']}) due to {$detectionsCount} detection(s)");

            return true;
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error("FeatherZeroTrust: Failed to auto-suspend server {$serverUuid}: " . $e->getMessage());

            return false;
        }
    }
}
