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

namespace App\Middleware;

use App\Chat\WebNode;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates FeatherQuilld (web hosting) daemons only.
 *
 * Uses featherpanel_web_nodes credentials. Game node (FeatherWings) tokens are
 * rejected — they must use /api/remote/* with WingsMiddleware instead.
 */
class FeatherQuilldMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        $token = self::getBearerToken($request);

        if ($token === null || $token === '') {
            return ApiResponse::error('You need authorization to hit this endpoint!', 'NO_QUILLD_TOKEN', 401, []);
        }

        $token = str_replace('Bearer ', '', $token);
        $parts = explode('.', $token, 2);
        $tokenId = $parts[0] ?? '';
        $tokenSecret = $parts[1] ?? '';

        if ($tokenId === '' || $tokenSecret === '') {
            return ApiResponse::error('Invalid FeatherQuilld authorization format', 'INVALID_QUILLD_TOKEN', 401, []);
        }

        $webNode = WebNode::getWebNodeByDaemonAuth($tokenId, $tokenSecret);
        if ($webNode === null) {
            return ApiResponse::error('You are not authorized to hit this endpoint!', 'INVALID_QUILLD_TOKEN', 401, []);
        }

        $request->attributes->set('quilld_token', $token);
        $request->attributes->set('quilld_token_id', $tokenId);
        $request->attributes->set('quilld_token_secret', $tokenSecret);
        $request->attributes->set('quilld_node', $webNode);

        return $next($request);
    }

    public static function getBearerToken(Request $request): ?string
    {
        return $request->headers->get('Authorization');
    }
}
