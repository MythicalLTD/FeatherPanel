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

use App\Chat\OidcProvider;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class OidcPublicController
{
    #[OA\Get(
        path: '/api/system/oidc/providers',
        summary: 'List enabled OIDC providers (public)',
        description: 'Returns enabled OIDC providers with safe fields for rendering SSO buttons.',
        tags: ['System - OIDC'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Providers retrieved successfully'
            ),
        ]
    )]
    public function index(Request $request): Response
    {
        $providers = OidcProvider::getEnabledProviders();

        return ApiResponse::success(['providers' => $providers], 'Providers fetched successfully', 200);
    }
}

