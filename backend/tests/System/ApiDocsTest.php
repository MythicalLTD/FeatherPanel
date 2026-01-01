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
use App\Controllers\System\ApiDocs;
use Symfony\Component\HttpFoundation\Request;

class ApiDocsTest extends TestCase
{
    private ApiDocs $controller;

    protected function setUp(): void
    {
        if (!defined('APP_VERSION')) {
            define('APP_VERSION', 'v1.1.2');
        }
        $this->controller = new ApiDocs();
    }

    public function testIndexReturnsValidJson()
    {
        $request = Request::create('/api/openapi.json', 'GET');
        $response = $this->controller->index($request);
        $data = json_decode($response->getContent(), true);

        // Should return valid JSON
        $this->assertNotNull($data);
        $this->assertIsArray($data);
    }

    public function testIndexReturnsOpenApiSpec()
    {
        $request = Request::create('/api/openapi.json', 'GET');
        $response = $this->controller->index($request);
        $data = json_decode($response->getContent(), true);

        // Should have OpenAPI required fields
        $this->assertArrayHasKey('openapi', $data);
        $this->assertArrayHasKey('info', $data);

        // Info should have required fields
        if (isset($data['info'])) {
            $this->assertArrayHasKey('title', $data['info']);
            $this->assertArrayHasKey('version', $data['info']);
        }
    }

    public function testIndexReturns200Status()
    {
        $request = Request::create('/api/openapi.json', 'GET');
        $response = $this->controller->index($request);

        $this->assertEquals(200, $response->getStatusCode());
    }
}
