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

use PHPUnit\Framework\TestCase;
use App\Helpers\RateLimitConfig;

class RateLimitConfigRefreshTest extends TestCase
{
    private string $file;
    private string $previousPath;

    protected function setUp(): void
    {
        $this->file = tempnam(sys_get_temp_dir(), 'fp-ratelimit-');
        $this->previousPath = RateLimitConfig::getConfigPath();
        $this->setPath($this->file);
    }

    protected function tearDown(): void
    {
        $this->setPath($this->previousPath);
        RateLimitConfig::reloadConfig();
        @unlink($this->file);
    }

    public function testConfigEditedByAnotherProcessIsPickedUp(): void
    {
        file_put_contents($this->file, json_encode(['_enabled' => true, '_enabled_explicit' => true, 'routes' => []]));
        RateLimitConfig::reloadConfig();
        $this->assertTrue(RateLimitConfig::isGloballyEnabled());

        // Another php-fpm process / worker switches rate limiting off.
        file_put_contents($this->file, json_encode(['_enabled' => false, '_enabled_explicit' => true, 'routes' => []]));
        $this->assertTrue(RateLimitConfig::isGloballyEnabled(), 'cached within a request');

        RateLimitConfig::refreshIfChanged();
        $this->assertFalse(RateLimitConfig::isGloballyEnabled());

        RateLimitConfig::refreshIfChanged();
        $this->assertFalse(RateLimitConfig::isGloballyEnabled(), 'an unchanged file keeps the cache');
    }

    private function setPath(string $path): void
    {
        (new ReflectionProperty(RateLimitConfig::class, 'configPath'))->setValue(null, $path);
    }
}
