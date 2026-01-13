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
