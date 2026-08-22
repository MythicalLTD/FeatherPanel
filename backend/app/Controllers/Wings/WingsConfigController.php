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

namespace App\Controllers\Wings;

use App\Chat\Node;
use App\Helpers\ApiResponse;
use App\Helpers\AppUrlHelper;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Serves FeatherWings configuration via GET /api/remote/config.
 *
 * Game nodes only. Web hosting nodes use /api/quilld-remote/config.
 */
class WingsConfigController
{
    /**
     * GET /api/remote/config — full Wings config.yml as YAML for the authenticated game node.
     */
    public function getConfig(Request $request): Response
    {
        $node = $request->attributes->get('wings_node');
        if (!is_array($node)) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        $panelUrl = AppUrlHelper::wingsRemoteUrl();
        $yaml = Node::generateWingsConfigYaml($node, $panelUrl);

        return new Response($yaml, 200, [
            'Content-Type' => 'application/x-yaml',
            'Content-Disposition' => 'inline; filename="config.yml"',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With',
        ]);
    }
}
