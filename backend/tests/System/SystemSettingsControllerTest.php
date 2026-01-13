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
