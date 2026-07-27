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
use App\Helpers\PanelAssetUrl;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Legacy storage-icon proxy endpoint.
 *
 * Previously proxied marketplace icons from api.featherpanel.com (EOL / offline).
 * Mythic icons are absolute CDN URLs and do not use this route.
 */
class PanelStorageIconController
{
    public function getIcon(Request $request, string $filename): Response
    {
        $decoded = rawurldecode($filename);
        if (str_contains($decoded, '/') || str_contains($decoded, '\\') || str_contains($decoded, '..')) {
            return ApiResponse::error('Invalid icon filename', 'INVALID_ICON', 400);
        }
        if (!PanelAssetUrl::isSafeIconBasename($decoded)) {
            return ApiResponse::error('Invalid icon filename', 'INVALID_ICON', 400);
        }

        return ApiResponse::error(
            'Legacy icon CDN (api.featherpanel.com) is offline. Use absolute Mythic CDN icon URLs.',
            'LEGACY_ICON_CDN_GONE',
            410,
        );
    }
}
