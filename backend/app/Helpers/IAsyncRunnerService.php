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

namespace App\Helpers;

use App\App;

class IAsyncRunnerService
{
    private const CHANELL_BASE = 'featherpanel:';

    /**
     * Dispatches an event to the rust async runner.
     *
     * @param string $type The type of event you want to send (email,vm,etc...)
     * @param string $action (ex: pending, create, failed, etc..)
     * @param array $payload The payload you want to send
     */
    public static function dispatch(string $type, string $action, array $payload): void
    {
        $app = App::getInstance(true, false, false);

        try {
            $redis = $app->getRedisConnection();

            if ($redis) {
                $channel = self::CHANELL_BASE . $type . ':' . $action;
                $message = json_encode($payload);

                $redis->publish($channel, $message);
            } else {
                $app->getLogger()->error('Failed to dispatch event to Rust async runner: Redis connection is not available.');
            }
        } catch (\Exception $e) {
            $app->getLogger()->error('Failed to dispatch event to Rust async runner: ' . $e->getMessage());
        }
    }

    public static function notifyMailPending(int $qId): void
    {
        self::dispatch('mail', 'pending', [
            'queue_id' => (string) $qId,
            'timestamp' => time(),
        ]);
    }

    public static function notifyVmTask(string $id): void
    {
        self::dispatch('vm', 'pending', [
            'task_id' => $id,
        ]);
    }
}
