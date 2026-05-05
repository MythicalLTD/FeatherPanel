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

use App\Chat\LdapProvider;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class LdapPublicController
{
    #[OA\Get(
        path: '/api/ldap/providers',
        summary: 'List enabled LDAP providers (public)',
        description: 'Returns only enabled LDAP providers with minimal information for login page',
        tags: ['System - LDAP'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'List of enabled LDAP providers',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'providers',
                            type: 'array',
                            items: new OA\Items(
                                properties: [
                                    new OA\Property(property: 'uuid', type: 'string'),
                                    new OA\Property(property: 'name', type: 'string'),
                                ]
                            )
                        ),
                    ]
                )
            ),
        ]
    )]
    public function index(Request $request): Response
    {
        $providers = LdapProvider::getEnabledProviders();

        return ApiResponse::success(['providers' => $providers], 'Providers fetched successfully', 200);
    }
}
