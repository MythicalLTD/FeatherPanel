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

namespace App\Cli\Commands;

use App\Cli\App;
use App\Cli\CommandBuilder;

class TestAsyncRunner extends App implements CommandBuilder
{
    public static function execute(array $args): void
    {
        $app = App::getInstance();

        $app->sendOutputWithNewLine('&7Testing Async Runner via Redis...');
        $app->sendOutputWithNewLine('');

        if (!file_exists(__DIR__ . '/../../../storage/config/.env')) {
            $app->send('&cThe .env file does not exist. Please create one before running this command');
            exit;
        }

        $mainapp = \App\App::getInstance(false, false, true);
        $mainapp->loadEnv();

        try {
            $redis = new \Redis();
            $host = $_ENV['REDIS_HOST'] ?? '127.0.0.1';
            $port = (int)($_ENV['REDIS_PORT'] ?? 6379);

            try {
                $connected = $redis->connect($host, $port);
                if (!$connected) {
                    throw new \Exception('Connection returned false');
                }
                if (!empty($_ENV['REDIS_PASSWORD'])) {
                    $redis->auth($_ENV['REDIS_PASSWORD']);
                }
            } catch (\Exception $e) {
                $app->sendOutputWithNewLine('&cFATAL: Redis connection failed: ' . $e->getMessage());
                $app->sendOutputWithNewLine('&7Checking Redis configuration...');
                $app->sendOutputWithNewLine('&7REDIS_HOST: ' . $host);
                $app->sendOutputWithNewLine('&7REDIS_PORT: ' . $port);
                $app->sendOutputWithNewLine('&7REDIS_PASSWORD: ' . (empty($_ENV['REDIS_PASSWORD']) ? 'NOT SET or EMPTY' : '***'));
                exit;
            }

            // Check active channels
            $app->sendOutputWithNewLine('&7Checking active channels...');
            $channels = $redis->pubsub('channels', 'featherpanel:*');
            if (empty($channels)) {
                $app->sendOutputWithNewLine('&eNo active channels found. Is the async runner running?');
            } else {
                $app->sendOutputWithNewLine('&aActive channels:');
                foreach ($channels as $channel) {
                    $numSub = $redis->pubsub('numsub', [$channel]);
                    $subscribers = $numSub[$channel] ?? 0;
                    $app->sendOutputWithNewLine("  &d{$channel} &7({$subscribers} subscriber(s))");
                }
            }
            $app->sendOutputWithNewLine('');

            // Send test message
            $app->sendOutputWithNewLine('&7Sending test message to featherpanel:mail:pending...');
            $payload = json_encode(['queue_id' => 'test-' . time()]);
            $result = $redis->publish('featherpanel:mail:pending', $payload);

            if ($result > 0) {
                $app->sendOutputWithNewLine("&aMessage sent! {$result} subscriber(s) received it.");
                $app->sendOutputWithNewLine('&7Check the async runner logs to see it being processed!');
            } else {
                $app->sendOutputWithNewLine('&eMessage sent, but no subscribers received it.');
                $app->sendOutputWithNewLine('&eMake sure the async runner is running!');
            }
        } catch (\Exception $e) {
            $app->sendOutputWithNewLine('&cError: ' . $e->getMessage());
        }
    }

    public static function getDescription(): string
    {
        return 'Test mail sending';
    }

    public static function getSubCommands(): array
    {
        return [];
    }
}
