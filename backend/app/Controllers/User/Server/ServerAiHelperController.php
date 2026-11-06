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

namespace App\Controllers\User\Server;

use App\App;
use App\Chat\Server;
use App\SubuserPermissions;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Services\Chatbot\AiEditorHelperService;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Optional AI helper for console crashes and the file editor.
 * Returns explanations and suggested diffs only — never writes files by itself.
 */
class ServerAiHelperController
{
    use CheckSubuserPermissionsTrait;

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/ai/helper',
        summary: 'Explain console errors and suggest a file diff',
        description: 'Uses the panel chatbot provider (OpenRouter etc.). Secrets are redacted before leaving the panel. Suggestions are never auto-applied.',
        tags: ['User - Servers'],
        parameters: [new OA\Parameter(name: 'uuidShort', in: 'path', required: true, schema: new OA\Schema(type: 'string'))],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'console_log', type: 'string'),
                    new OA\Property(property: 'file_path', type: 'string'),
                    new OA\Property(property: 'file_content', type: 'string'),
                    new OA\Property(property: 'question', type: 'string'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Explanation and optional suggested diff'),
            new OA\Response(response: 403, description: 'Disabled or permission denied'),
            new OA\Response(response: 400, description: 'Invalid request'),
        ]
    )]
    public function explain(Request $request, string $uuidShort): Response
    {
        $server = Server::getServerByUuidShort($uuidShort);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $user = $request->attributes->get('user');
        if (!$user || !isset($user['uuid'])) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $body = json_decode($request->getContent() ?: '{}', true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_REQUEST', 400);
        }

        $hasConsole = trim((string) ($body['console_log'] ?? '')) !== '';
        $hasFile = trim((string) ($body['file_content'] ?? '')) !== '' || trim((string) ($body['file_path'] ?? '')) !== '';

        // Console context needs console permission; file context needs read-content.
        if ($hasConsole) {
            if ($denied = $this->checkPermission($request, $server, SubuserPermissions::CONTROL_CONSOLE)) {
                return $denied;
            }
        }
        if ($hasFile) {
            if ($denied = $this->checkPermission($request, $server, SubuserPermissions::FILE_READ_CONTENT)) {
                return $denied;
            }
        }
        if (!$hasConsole && !$hasFile) {
            // Question-only still requires at least console OR file read so random users cannot burn AI quota.
            if ($denied = $this->checkAnyPermission($request, $server, [
                SubuserPermissions::CONTROL_CONSOLE,
                SubuserPermissions::FILE_READ_CONTENT,
            ])) {
                return $denied;
            }
        }

        $service = new AiEditorHelperService();
        if (!$service->isEnabled()) {
            return ApiResponse::error('The AI editor helper is disabled', 'AI_HELPER_DISABLED', 403);
        }

        try {
            $result = $service->explain([
                'console_log' => (string) ($body['console_log'] ?? ''),
                'file_path' => (string) ($body['file_path'] ?? ''),
                'file_content' => (string) ($body['file_content'] ?? ''),
                'question' => (string) ($body['question'] ?? ''),
            ], $user);

            return ApiResponse::success($result, 'AI helper response ready');
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 'INVALID_REQUEST', 400);
        } catch (\RuntimeException $e) {
            $code = $e->getCode() === 403 ? 403 : 502;
            $errorCode = $code === 403 ? 'AI_HELPER_DISABLED' : 'AI_HELPER_ERROR';

            return ApiResponse::error($e->getMessage(), $errorCode, $code);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('AI editor helper failed: ' . $e->getMessage());

            return ApiResponse::error('Failed to run the AI helper. Please try again.', 'AI_HELPER_ERROR', 500);
        }
    }
}
