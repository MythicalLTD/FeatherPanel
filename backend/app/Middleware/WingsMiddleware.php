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
