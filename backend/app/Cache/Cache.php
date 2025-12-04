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

namespace App\Cache;

use App\App;
use App\FastChat\Redis;
use App\Config\ConfigInterface;

/**
 * Class Cache.
 *
 * Provides caching functionality with support for file-based and Redis caching.
 * The cache driver is determined by the cache_driver configuration setting.
 */
class Cache
{
    protected static $cacheDir = APP_CACHE_DIR . '/other';
    protected static $cacheExt = '.fpc';
    protected static $driver;
    protected static $redisInstance;

    /**
     * Stores a value in the cache with a specified expiration time.
     *
     * @param string $key the cache key used to reference the data
     * @param mixed $value the data to be cached
     * @param int $minutes number of minutes before the data expires
     *
     * @return void
     */
    public static function put($key, $value, $minutes = 60)
    {
        $driver = self::getDriver();

        if ($driver === 'redis') {
            self::putRedis($key, $value, $minutes);
        } else {
            self::putFile($key, $value, $minutes);
        }
    }

    /**
     * Retrieves a value from the cache by its key.
     *
     * @param string $key the cache key for the stored data
     *
     * @return mixed|null returns the stored data or null if not found or expired
     */
    public static function get($key)
    {
        $driver = self::getDriver();

        if ($driver === 'redis') {
            return self::getRedis($key);
        }

        return self::getFile($key);
    }

    /**
     * Removes a cached entry by its key.
     *
     * @param string $key the cache key to remove
     *
     * @return void
     */
    public static function forget($key)
    {
        $driver = self::getDriver();

        if ($driver === 'redis') {
            self::forgetRedis($key);
        } else {
            self::forgetFile($key);
        }
    }

    /**
     * Clears all entries in the cache.
     *
     * @return void
     */
    public static function clear()
    {
        $driver = self::getDriver();

        if ($driver === 'redis') {
            self::clearRedis();
        } else {
            self::clearFile();
        }
    }

    /**
     * Checks if a valid cached entry exists for the specified key.
     *
     * @param string $key the cache key to check
     *
     * @return bool true if a valid cached entry exists, otherwise false
     */
    public static function exists($key)
    {
        $driver = self::getDriver();

        if ($driver === 'redis') {
            return self::existsRedis($key);
        }

        return self::existsFile($key);
    }

    /**
     * Stores JSON data in the cache with a specified expiration time.
     *
     * @param string $key the cache key used to reference the JSON data
     * @param mixed $json the JSON data to be cached
     * @param int $minutes number of minutes before the data expires
     *
     * @return void
     */
    public static function putJson($key, $json, $minutes = 60)
    {
        self::put($key, $json, $minutes);
    }

    /**
     * Retrieves a previously stored JSON data by its key.
     *
     * @param string $key the cache key for the JSON data
     *
     * @return mixed|null returns the JSON data or null if not found or expired
     */
    public static function getJson($key)
    {
        return self::get($key);
    }

    /**
     * Gets the cache driver (file or redis) based on configuration.
     *
     * @return string the cache driver ('file' or 'redis')
     */
    protected static function getDriver(): string
    {
        if (self::$driver !== null) {
            return self::$driver;
        }

        try {
            $app = App::getInstance(true);
            $config = $app->getConfig();
            $driver = $config->getSetting(ConfigInterface::CACHE_DRIVER, 'file');

            // Validate driver
            if ($driver !== 'redis' && $driver !== 'file') {
                $driver = 'file';
            }

            // If Redis is requested, verify it's available
            if ($driver === 'redis') {
                if (!defined('REDIS_ENABLED') || !REDIS_ENABLED) {
                    $app->getLogger()->warning('Redis cache requested but Redis is not enabled, falling back to file cache');
                    $driver = 'file';
                } else {
                    try {
                        if (self::$redisInstance === null) {
                            self::$redisInstance = new Redis();
                            if (!self::$redisInstance->testConnection()) {
                                $app->getLogger()->warning('Redis cache requested but connection failed, falling back to file cache');
                                $driver = 'file';
                                self::$redisInstance = null;
                            }
                        }
                    } catch (\Exception $e) {
                        $app->getLogger()->error('Failed to initialize Redis cache: ' . $e->getMessage());
                        $driver = 'file';
                        self::$redisInstance = null;
                    }
                }
            }

            self::$driver = $driver;

            return $driver;
        } catch (\Exception $e) {
            // Fallback to file cache if config access fails
            return 'file';
        }
    }

    /**
     * Stores a value in file cache.
     *
     * @param string $key the cache key used to reference the data
     * @param mixed $value the data to be cached
     * @param int $minutes number of minutes before the data expires
     *
     * @return void
     */
    protected static function putFile($key, $value, $minutes = 60)
    {
        if (!is_dir(self::$cacheDir)) {
            mkdir(self::$cacheDir, 0777, true);
        }
        $filename = self::$cacheDir . '/' . md5($key) . self::$cacheExt;
        $data = [
            'expires' => time() + ($minutes * 60),
            'value' => $value,
        ];
        file_put_contents($filename, serialize($data));
    }

    /**
     * Stores a value in Redis cache.
     *
     * @param string $key the cache key used to reference the data
     * @param mixed $value the data to be cached
     * @param int $minutes number of minutes before the data expires
     *
     * @return void
     */
    protected static function putRedis($key, $value, $minutes = 60)
    {
        try {
            $redis = self::$redisInstance->getRedis();
            $serialized = serialize($value);
            $ttl = $minutes * 60; // Convert minutes to seconds
            $redis->setex('cache:' . $key, $ttl, $serialized);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to store cache in Redis: ' . $e->getMessage());
            // Fallback to file cache
            self::putFile($key, $value, $minutes);
        }
    }

    /**
     * Retrieves a value from file cache.
     *
     * @param string $key the cache key for the stored data
     *
     * @return mixed|null returns the stored data or null if not found or expired
     */
    protected static function getFile($key)
    {
        $filename = self::$cacheDir . '/' . md5($key) . self::$cacheExt;
        if (!file_exists($filename)) {
            return null;
        }
        $data = unserialize(file_get_contents($filename));
        if (time() > $data['expires']) {
            unlink($filename);

            return null;
        }

        return $data['value'];
    }

    /**
     * Retrieves a value from Redis cache.
     *
     * @param string $key the cache key for the stored data
     *
     * @return mixed|null returns the stored data or null if not found or expired
     */
    protected static function getRedis($key)
    {
        try {
            $redis = self::$redisInstance->getRedis();
            $serialized = $redis->get('cache:' . $key);

            if ($serialized === null) {
                return null;
            }

            return unserialize($serialized);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to retrieve cache from Redis: ' . $e->getMessage());

            // Fallback to file cache
            return self::getFile($key);
        }
    }

    /**
     * Removes a cached entry from file cache.
     *
     * @param string $key the cache key to remove
     *
     * @return void
     */
    protected static function forgetFile($key)
    {
        $filename = self::$cacheDir . '/' . md5($key) . self::$cacheExt;
        if (file_exists($filename)) {
            unlink($filename);
        }
    }

    /**
     * Removes a cached entry from Redis cache.
     *
     * @param string $key the cache key to remove
     *
     * @return void
     */
    protected static function forgetRedis($key)
    {
        try {
            $redis = self::$redisInstance->getRedis();
            $redis->del('cache:' . $key);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to delete cache from Redis: ' . $e->getMessage());
            // Fallback to file cache
            self::forgetFile($key);
        }
    }

    /**
     * Clears all entries in the file cache directory.
     *
     * @return void
     */
    protected static function clearFile()
    {
        $files = glob(self::$cacheDir . '/*' . self::$cacheExt);
        foreach ($files as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
    }

    /**
     * Clears all cache entries from Redis (only cache:* keys).
     *
     * @return void
     */
    protected static function clearRedis()
    {
        try {
            $redis = self::$redisInstance->getRedis();
            $keys = $redis->keys('cache:*');
            if (!empty($keys)) {
                $redis->del($keys);
            }
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to clear cache from Redis: ' . $e->getMessage());
            // Fallback to file cache
            self::clearFile();
        }
    }

    /**
     * Checks if a valid cached entry exists in file cache.
     *
     * @param string $key the cache key to check
     *
     * @return bool true if a valid cached entry exists, otherwise false
     */
    protected static function existsFile($key)
    {
        $filename = self::$cacheDir . '/' . md5($key) . self::$cacheExt;
        if (!is_file($filename)) {
            return false;
        }
        $data = @unserialize(file_get_contents($filename));
        if (!is_array($data) || !isset($data['expires'])) {
            return false;
        }

        return time() <= $data['expires'];
    }

    /**
     * Checks if a valid cached entry exists in Redis cache.
     *
     * @param string $key the cache key to check
     *
     * @return bool true if a valid cached entry exists, otherwise false
     */
    protected static function existsRedis($key)
    {
        try {
            $redis = self::$redisInstance->getRedis();

            return $redis->exists('cache:' . $key) > 0;
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to check cache existence in Redis: ' . $e->getMessage());

            // Fallback to file cache
            return self::existsFile($key);
        }
    }
}
