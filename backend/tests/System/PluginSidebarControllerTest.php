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
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\System\PluginSidebarController;

class PluginSidebarControllerTest extends TestCase
{
    private PluginSidebarController $controller;

    protected function setUp(): void
    {
        $this->controller = new PluginSidebarController();
    }

    public function testIndexReturnsSuccess()
    {
        $request = Request::create('/api/system/plugin-sidebar', 'GET');
        $response = $this->controller->index($request);
        $data = json_decode($response->getContent(), true);

        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('sidebar', $data['data']);
    }

    public function testIndexReturnsSidebarStructure()
    {
        $request = Request::create('/api/system/plugin-sidebar', 'GET');
        $response = $this->controller->index($request);
        $data = json_decode($response->getContent(), true);

        $sidebar = $data['data']['sidebar'];

        // Should have all three sections
        $this->assertArrayHasKey('server', $sidebar);
        $this->assertArrayHasKey('client', $sidebar);
        $this->assertArrayHasKey('admin', $sidebar);

        // All sections should be arrays
        $this->assertIsArray($sidebar['server']);
        $this->assertIsArray($sidebar['client']);
        $this->assertIsArray($sidebar['admin']);
    }

    public function testIndexReturns200Status()
    {
        $request = Request::create('/api/system/plugin-sidebar', 'GET');
        $response = $this->controller->index($request);

        $this->assertEquals(200, $response->getStatusCode());
    }
}
