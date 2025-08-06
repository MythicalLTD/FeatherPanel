<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
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
