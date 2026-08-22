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

namespace App\Controllers\Quilld;

use App\Chat\WebNode;
use App\Helpers\ApiResponse;
use App\Helpers\AppUrlHelper;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Serves FeatherQuilld runtime config via GET /api/quilld-remote/config.
 *
 * Separate from FeatherWings (/api/remote/config) — different middleware and credentials.
 */
class FeatherQuilldConfigController
{
    /**
     * GET /api/quilld-remote/config — runtime config YAML for the authenticated web node.
     */
    public function getConfig(Request $request): Response
    {
        $webNode = $request->attributes->get('quilld_node');
        if (!is_array($webNode)) {
            return ApiResponse::error('Invalid FeatherQuilld authentication', 'INVALID_QUILLD_AUTH', 403);
        }

        $panelUrl = AppUrlHelper::wingsRemoteUrl();
        $yaml = WebNode::generateFeatherQuilldRuntimeConfigYaml($webNode, $panelUrl);

        return new Response($yaml, 200, [
            'Content-Type' => 'application/x-yaml',
            'Content-Disposition' => 'inline; filename="config.yml"',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With',
        ]);
    }
}
