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

use App\Helpers\ApiResponse;
use PHPUnit\Framework\TestCase;

class ApiResponseTest extends TestCase
{
    public function testSuccessReturnsCorrectStructure()
    {
        $response = ApiResponse::success(['test' => 'data'], 'Success message', 200);
        $data = json_decode($response->getContent(), true);

        $this->assertTrue($data['success']);
        $this->assertEquals('Success message', $data['message']);
        $this->assertEquals(['test' => 'data'], $data['data']);
        $this->assertFalse($data['error']);
        $this->assertNull($data['error_message']);
        $this->assertNull($data['error_code']);
    }

    public function testSuccessReturns200Status()
    {
        $response = ApiResponse::success(null, 'OK', 200);
        $this->assertEquals(200, $response->getStatusCode());
    }

    public function testSuccessHasCorsHeaders()
    {
        $response = ApiResponse::success();
        $this->assertEquals('application/json', $response->headers->get('Content-Type'));
        $this->assertEquals('*', $response->headers->get('Access-Control-Allow-Origin'));
    }

    public function testErrorReturnsCorrectStructure()
    {
        $response = ApiResponse::error('Error occurred', 'ERROR_CODE', 400);
        $data = json_decode($response->getContent(), true);

        $this->assertFalse($data['success']);
        $this->assertEquals('Error occurred', $data['message']);
        $this->assertTrue($data['error']);
        $this->assertEquals('Error occurred', $data['error_message']);
        $this->assertEquals('ERROR_CODE', $data['error_code']);
        $this->assertArrayHasKey('errors', $data);
    }

    public function testErrorReturns400StatusByDefault()
    {
        $response = ApiResponse::error('Error message');
        $this->assertEquals(400, $response->getStatusCode());
    }

    public function testErrorIncludesErrorsArray()
    {
        $response = ApiResponse::error('Test error', 'TEST_ERROR', 404);
        $data = json_decode($response->getContent(), true);

        $this->assertIsArray($data['errors']);
        $this->assertCount(1, $data['errors']);
        $this->assertEquals('TEST_ERROR', $data['errors'][0]['code']);
        $this->assertEquals('Test error', $data['errors'][0]['detail']);
        $this->assertEquals(404, $data['errors'][0]['status']);
    }

    public function testExceptionReturnsCorrectStructure()
    {
        $response = ApiResponse::exception('Exception occurred', 'Exception details', ['trace1', 'trace2']);
        $data = json_decode($response->getContent(), true);

        $this->assertFalse($data['success']);
        $this->assertEquals('Exception occurred', $data['message']);
        $this->assertEquals('Exception details', $data['error']);
        $this->assertArrayHasKey('trace', $data);
    }

    public function testExceptionReturns500Status()
    {
        $response = ApiResponse::exception('Error', 'Details');
        $this->assertEquals(500, $response->getStatusCode());
    }

    public function testSendManualResponseReturnsCustomData()
    {
        $customData = ['custom' => 'response', 'number' => 42];
        $response = ApiResponse::sendManualResponse($customData, 201);
        $data = json_decode($response->getContent(), true);

        $this->assertEquals($customData, $data);
        $this->assertEquals(201, $response->getStatusCode());
    }
}
