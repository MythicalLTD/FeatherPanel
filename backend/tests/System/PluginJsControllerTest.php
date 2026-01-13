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
use App\Controllers\System\PluginJsController;

class PluginJsControllerTest extends TestCase
{
    private PluginJsController $controller;

    protected function setUp(): void
    {
        $this->controller = new PluginJsController();
    }

    public function testIndexReturnsJavaScript()
    {
        $request = Request::create('/api/system/plugin-js', 'GET');
        $response = $this->controller->index($request);

        // Should return 200
        $this->assertEquals(200, $response->getStatusCode());

        // Should have JavaScript content type
        $this->assertEquals('application/javascript', $response->headers->get('Content-Type'));
    }

    public function testIndexReturnsNoCacheHeaders()
    {
        $request = Request::create('/api/system/plugin-js', 'GET');
        $response = $this->controller->index($request);

        // Should have no-cache headers
        $this->assertStringContainsString('no-cache', $response->headers->get('Cache-Control'));
        $this->assertEquals('no-cache', $response->headers->get('Pragma'));
    }

    public function testIndexReturnsValidJavaScriptString()
    {
        $request = Request::create('/api/system/plugin-js', 'GET');
        $response = $this->controller->index($request);

        $content = $response->getContent();
        // Should contain JavaScript comment
        $this->assertStringContainsString('// Plugin JavaScript', $content);
    }
}
