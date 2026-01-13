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

use App\Chat\Node;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WingsMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        $token = $this->getWingsToken($request);

        if ($token == null) {
            return ApiResponse::error('You need authorization to hit this endpoint!', 'NO_WINGS_TOKEN', 401, []);
        }

        $token = str_replace('Bearer ', '', $token);
        $tokenId = explode('.', $token)[0];
        $tokenSecret = explode('.', $token)[1];

        if (!Node::isWingsAuthValid($tokenId, $tokenSecret)) {
            return ApiResponse::error('You are not authorized to hit this endpoint!', 'INVALID_WINGS_TOKEN', 401, []);
        }

        $request->attributes->set('wings_token', $token);
        $request->attributes->set('wings_token_id', $tokenId);
        $request->attributes->set('wings_token_secret', $tokenSecret);

        return $next($request);
    }

    /**
     * Get the authenticated user from the request (if available).
     */
    public static function getWingsToken(Request $request): ?string
    {
        return $request->headers->get('Authorization');
    }
}
