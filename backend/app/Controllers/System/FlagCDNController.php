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

namespace App\Controllers\System;

use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Services\FlagCDN\FlagCDNService;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'CountryCode',
    type: 'object',
    properties: [
        new OA\Property(property: 'code', type: 'string', description: 'ISO 3166-1 alpha-2 country code'),
        new OA\Property(property: 'name', type: 'string', description: 'Country name'),
    ]
)]
class FlagCDNController
{
    #[OA\Get(
        path: '/api/system/country-codes',
        summary: 'Get all country codes',
        description: 'Retrieve all available country codes and names from FlagCDN. This endpoint is cached for 24 hours.',
        tags: ['System'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Country codes retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'country_codes',
                            type: 'object',
                            additionalProperties: new OA\AdditionalProperties(type: 'string'),
                            description: 'Object mapping country codes to country names'
                        ),
                    ]
                )
            ),
            new OA\Response(response: 500, description: 'Internal server error - Failed to fetch country codes'),
        ]
    )]
    public function getCountryCodes(Request $request): Response
    {
        try {
            $countryCodes = FlagCDNService::getCountryCodes();

            return ApiResponse::success([
                'country_codes' => $countryCodes,
            ], 'Country codes fetched successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch country codes', 'FETCH_ERROR', 500);
        }
    }
}
