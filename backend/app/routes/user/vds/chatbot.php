<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studio
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

use App\App;
use RateLimit\Rate;
use App\Helpers\ApiResponse;
use App\Controllers\User\VdsChatbotController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'vds-chatbot-chat',
        '/api/user/vds-chatbot/chat',
        function (Request $request) {
            return (new VdsChatbotController())->chat($request);
        },
        ['POST'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-vds-chatbot'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'vds-chatbot-conversations',
        '/api/user/vds-chatbot/conversations',
        function (Request $request) {
            return (new VdsChatbotController())->getConversations($request);
        },
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-vds-chatbot'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'vds-chatbot-conversation',
        '/api/user/vds-chatbot/conversations/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid conversation ID', 'INVALID_ID', 400);
            }

            return (new VdsChatbotController())->getConversation($request, (int) $id);
        },
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-vds-chatbot'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'vds-chatbot-conversation-delete',
        '/api/user/vds-chatbot/conversations/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid conversation ID', 'INVALID_ID', 400);
            }

            return (new VdsChatbotController())->deleteConversation($request, (int) $id);
        },
        ['DELETE'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-vds-chatbot'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'vds-chatbot-conversation-memory',
        '/api/user/vds-chatbot/conversations/{id}/memory',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid conversation ID', 'INVALID_ID', 400);
            }

            return (new VdsChatbotController())->updateMemory($request, (int) $id);
        },
        ['PATCH'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-vds-chatbot'
    );
};
