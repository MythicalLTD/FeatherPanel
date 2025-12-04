<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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
