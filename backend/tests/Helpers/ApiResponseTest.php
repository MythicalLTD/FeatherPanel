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
