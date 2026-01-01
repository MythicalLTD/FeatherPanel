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

use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\System\PluginCssController;

class PluginCssControllerTest extends TestCase
{
    private PluginCssController $controller;

    protected function setUp(): void
    {
        $this->controller = new PluginCssController();
    }

    public function testIndexReturnsCSS()
    {
        $request = Request::create('/api/system/plugin-css', 'GET');
        $response = $this->controller->index($request);

        // Should return 200
        $this->assertEquals(200, $response->getStatusCode());

        // Should have CSS content type
        $this->assertEquals('text/css', $response->headers->get('Content-Type'));
    }

    public function testIndexReturnsNoCacheHeaders()
    {
        $request = Request::create('/api/system/plugin-css', 'GET');
        $response = $this->controller->index($request);

        // Should have no-cache headers
        $this->assertStringContainsString('no-cache', $response->headers->get('Cache-Control'));
        $this->assertEquals('no-cache', $response->headers->get('Pragma'));
    }

    public function testIndexReturnsValidCSSString()
    {
        $request = Request::create('/api/system/plugin-css', 'GET');
        $response = $this->controller->index($request);

        $content = $response->getContent();
        // Should contain CSS comment
        $this->assertStringContainsString('/* Plugin CSS */', $content);
    }
}
