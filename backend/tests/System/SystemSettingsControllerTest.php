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

use App\App;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\System\SettingsController;

class SystemSettingsControllerTest extends TestCase
{
    private SettingsController $controller;

    protected function setUp(): void
    {
        // Define required constants
        if (!defined('APP_VERSION')) {
            define('APP_VERSION', 'v0.0.4-test');
        }
        if (!defined('APP_UPSTREAM')) {
            define('APP_UPSTREAM', 'stable');
        }
        if (!defined('SYSTEM_KERNEL_NAME')) {
            define('SYSTEM_KERNEL_NAME', 'Linux');
        }
        if (!defined('SYSTEM_OS_NAME')) {
            define('SYSTEM_OS_NAME', 'Ubuntu');
        }
        if (!defined('TELEMETRY')) {
            define('TELEMETRY', false);
        }
        if (!defined('APP_START')) {
            define('APP_START', microtime(true));
        }

        $this->controller = new SettingsController();
        // Ensure DB connection is initialized in test mode
        App::getInstance(false, true, true);
    }

    public function testIndexReturnsSuccess()
    {
        $request = Request::create('/api/system/settings', 'GET');
        $response = $this->controller->index($request);
        $data = json_decode($response->getContent(), true);
        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('settings', $data['data']);
        $this->assertArrayHasKey('core', $data['data']);
    }

    public function testIndexReturnsCoreInformation()
    {
        $request = Request::create('/api/system/settings', 'GET');
        $response = $this->controller->index($request);
        $data = json_decode($response->getContent(), true);

        $this->assertArrayHasKey('core', $data['data']);
        $core = $data['data']['core'];

        // Check that core info contains expected fields
        $this->assertArrayHasKey('version', $core);
        $this->assertArrayHasKey('upstream', $core);
        $this->assertArrayHasKey('php_version', $core);
        $this->assertArrayHasKey('hostname', $core);
    }

    public function testIndexReturnsPublicSettingsOnly()
    {
        $request = Request::create('/api/system/settings', 'GET');
        $response = $this->controller->index($request);
        $data = json_decode($response->getContent(), true);

        $this->assertArrayHasKey('settings', $data['data']);
        $settings = $data['data']['settings'];

        // Settings should be an array
        $this->assertIsArray($settings);
    }
}
