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
use App\Controllers\System\ApiDocs;
use Symfony\Component\HttpFoundation\Request;

class ApiDocsTest extends TestCase
{
    private ApiDocs $controller;

    protected function setUp(): void
    {
        if (!defined('APP_VERSION')) {
            define('APP_VERSION', 'v1.2.0');
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
