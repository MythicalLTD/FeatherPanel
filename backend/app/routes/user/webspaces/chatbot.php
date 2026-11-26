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

use App\App;
use RateLimit\Rate;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\User\WebSpaceChatbotController;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'webspace-chatbot-chat',
        '/api/user/webspace-chatbot/chat',
        function (Request $request) {
            return (new WebSpaceChatbotController())->chat($request);
        },
        ['POST'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-webspace-chatbot'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'webspace-chatbot-chat-stream',
        '/api/user/webspace-chatbot/chat/stream',
        function (Request $request) {
            return (new WebSpaceChatbotController())->streamChat($request);
        },
        ['POST'],
        Rate::perMinute(30),
        'user-webspace-chatbot'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'webspace-chatbot-conversations',
        '/api/user/webspace-chatbot/conversations',
        function (Request $request) {
            return (new WebSpaceChatbotController())->getConversations($request);
        },
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-webspace-chatbot'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'webspace-chatbot-conversation',
        '/api/user/webspace-chatbot/conversations/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid conversation ID', 'INVALID_ID', 400);
            }

            return (new WebSpaceChatbotController())->getConversation($request, (int) $id);
        },
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-webspace-chatbot'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'webspace-chatbot-conversation-delete',
        '/api/user/webspace-chatbot/conversations/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid conversation ID', 'INVALID_ID', 400);
            }

            return (new WebSpaceChatbotController())->deleteConversation($request, (int) $id);
        },
        ['DELETE'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-webspace-chatbot'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'webspace-chatbot-conversation-memory',
        '/api/user/webspace-chatbot/conversations/{id}/memory',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid conversation ID', 'INVALID_ID', 400);
            }

            return (new WebSpaceChatbotController())->updateMemory($request, (int) $id);
        },
        ['PATCH'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-webspace-chatbot'
    );
};
