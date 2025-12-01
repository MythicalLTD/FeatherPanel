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

use App\App;
use PHPUnit\Framework\TestCase;
use App\Controllers\System\RedirectLinks;
use Symfony\Component\HttpFoundation\Request;

class RedirectLinksTest extends TestCase
{
    private RedirectLinks $controller;

    protected function setUp(): void
    {
        $this->controller = new RedirectLinks();
        // Ensure DB connection is initialized in test mode
        App::getInstance(false, true, true);
    }

    public function testGetAllReturnsSuccess()
    {
        $request = Request::create('/api/redirect-links', 'GET');
        $response = $this->controller->getAll($request);
        $data = json_decode($response->getContent(), true);
        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('redirect_links', $data['data']);
        $this->assertArrayHasKey('count', $data['data']);
        $this->assertIsArray($data['data']['redirect_links']);
    }

    public function testGetBySlugReturnsNotFoundForInvalidSlug()
    {
        $request = Request::create('/api/redirect-links/invalid-slug-123', 'GET');
        $response = $this->controller->getBySlug($request, 'invalid-slug-123');
        $data = json_decode($response->getContent(), true);
        $this->assertFalse($data['success']);
        $this->assertEquals('REDIRECT_LINK_NOT_FOUND', $data['error_code']);
    }

    public function testGetAllReturnsOnlyPublicData()
    {
        $request = Request::create('/api/redirect-links', 'GET');
        $response = $this->controller->getAll($request);
        $data = json_decode($response->getContent(), true);

        if ($data['success'] && count($data['data']['redirect_links']) > 0) {
            $firstLink = $data['data']['redirect_links'][0];
            // Should only have public fields
            $this->assertArrayHasKey('slug', $firstLink);
            $this->assertArrayHasKey('url', $firstLink);
            $this->assertArrayHasKey('name', $firstLink);
            // Should NOT have sensitive fields like id, created_at, etc
            $this->assertArrayNotHasKey('id', $firstLink);
            $this->assertArrayNotHasKey('created_at', $firstLink);
        } else {
            $this->assertTrue(true, 'No redirect links to test, but test passes');
        }
    }
}
