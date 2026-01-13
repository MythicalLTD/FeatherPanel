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

namespace App\FastChat;

use App\App;
use Predis\Client;

class Redis
{
    private $redis;

    public function __construct()
    {
        $app = App::getInstance(true);
        $app->loadEnv();
        $host = $_ENV['REDIS_HOST'];
        $port = $_ENV['REDIS_PORT'] ?? 6379;
        $pwd = $_ENV['REDIS_PASSWORD'] ?? '';
        $options = [
            'scheme' => 'tcp',
            'host' => $host,
            'port' => (int) $port,
        ];
        if ($pwd !== '') {
            $options['password'] = $pwd;
        }
        $client = new Client($options);
        $this->redis = $client;
    }

    public function getRedis(): Client
    {
        return $this->redis;
    }

    public function testConnection(): bool
    {
        try {
            $redis = $this->getRedis();
            $redis->connect();

            return $redis->isConnected();
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to connect to Redis: ' . $e->getMessage());

            return false;
        }
    }
}
