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

namespace App\Controllers\User\Server\Bulk;

use App\App;
use App\Chat\Server;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Helpers\ServerGateway;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Controllers\User\Server\ServerUserController;
use App\Controllers\User\Server\Power\ServerPowerController;

/**
 * Runs one power action or a reinstall on several servers in a single request.
 *
 * Every server goes through the same checks as the single-server endpoints (access,
 * suspension, subuser permission, lifecycle hooks), and the result of each one is
 * reported back so the client can tell the user which servers failed and why.
 */
class ServerBulkActionController
{
    public const MAX_SERVERS = 25;
    public const MAX_REINSTALL_SERVERS = 10;
    private const ACTIONS = ['start', 'stop', 'restart', 'kill', 'reinstall'];

    #[OA\Post(
        path: '/api/user/servers/bulk-action',
        summary: 'Run an action on several servers',
        description: 'Send start, stop, restart, kill or reinstall to up to 25 servers (10 for reinstall). Each server is checked like the single-server endpoints and gets its own result.',
        tags: ['User - Server Power'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['action', 'servers'],
                properties: [
                    new OA\Property(property: 'action', type: 'string', enum: ['start', 'stop', 'restart', 'kill', 'reinstall']),
                    new OA\Property(property: 'servers', type: 'array', items: new OA\Items(type: 'string'), description: 'Server short UUIDs'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Per-server results'),
            new OA\Response(response: 400, description: 'Invalid action or server list'),
            new OA\Response(response: 401, description: 'Not authenticated'),
        ]
    )]
    public function run(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        $action = is_string($data['action'] ?? null) ? $data['action'] : '';
        if (!in_array($action, self::ACTIONS, true)) {
            return ApiResponse::error('Invalid bulk action', 'INVALID_BULK_ACTION', 400);
        }

        $servers = $data['servers'] ?? null;
        if (!is_array($servers)) {
            return ApiResponse::error('Select at least one server', 'BULK_NO_SERVERS', 400);
        }
        $uuidShorts = [];
        foreach ($servers as $value) {
            if (is_string($value) && preg_match('/^[A-Za-z0-9-]{1,64}$/', $value) === 1) {
                $uuidShorts[$value] = true;
            }
        }
        $uuidShorts = array_keys($uuidShorts);
        if ($uuidShorts === []) {
            return ApiResponse::error('Select at least one server', 'BULK_NO_SERVERS', 400);
        }

        $limit = $action === 'reinstall' ? self::MAX_REINSTALL_SERVERS : self::MAX_SERVERS;
        if (count($uuidShorts) > $limit) {
            return ApiResponse::error('Too many servers selected for this action', 'BULK_TOO_MANY_SERVERS', 400, ['limit' => $limit]);
        }

        $results = [];
        $succeeded = 0;
        foreach ($uuidShorts as $uuidShort) {
            $result = $this->runOne($request, $user, $uuidShort, $action);
            if ($result['success']) {
                ++$succeeded;
            }
            $results[] = $result;
        }

        return ApiResponse::success([
            'action' => $action,
            'succeeded' => $succeeded,
            'failed' => count($results) - $succeeded,
            'results' => $results,
        ], 'Bulk action finished', 200);
    }

    /**
     * @return array{uuidShort: string, name: string|null, success: bool, error_code: string|null, message: string|null}
     */
    private function runOne(Request $request, array $user, string $uuidShort, string $action): array
    {
        $server = Server::getServerByUuidShort($uuidShort);
        if (!$server || !ServerGateway::canUserAccessServer((string) $user['uuid'], (string) $server['uuid'], $user, $server)) {
            // Same answer for missing and foreign servers, so the endpoint cannot be used to probe ids.
            return $this->failure($uuidShort, null, 'SERVER_NOT_FOUND', 'Server not found');
        }

        $name = (string) ($server['name'] ?? $uuidShort);
        if (!empty($server['suspended'])) {
            return $this->failure($uuidShort, $name, 'SERVER_SUSPENDED', 'Server is suspended');
        }

        try {
            $response = $action === 'reinstall'
                ? (new ServerUserController())->reinstallServer($this->subRequest($request), $uuidShort)
                : (new ServerPowerController())->sendPowerAction($request, $uuidShort, $action);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Bulk ' . $action . ' failed for server ' . $uuidShort . ': ' . $e->getMessage());

            return $this->failure($uuidShort, $name, 'BULK_ACTION_FAILED', 'Action failed');
        }

        $body = json_decode((string) $response->getContent(), true);
        if ($response->isSuccessful() && is_array($body) && ($body['success'] ?? false) === true) {
            return [
                'uuidShort' => $uuidShort,
                'name' => $name,
                'success' => true,
                'error_code' => null,
                'message' => null,
            ];
        }

        return $this->failure(
            $uuidShort,
            $name,
            is_array($body) && is_string($body['error_code'] ?? null) ? $body['error_code'] : 'BULK_ACTION_FAILED',
            is_array($body) && is_string($body['message'] ?? null) ? $body['message'] : 'Action failed'
        );
    }

    /**
     * The reinstall controller reads wipe_files from the body. Bulk reinstalls never wipe
     * files, so it gets a copy of the request with an empty body.
     */
    private function subRequest(Request $request): Request
    {
        return new Request(
            $request->query->all(),
            [],
            $request->attributes->all(),
            $request->cookies->all(),
            [],
            $request->server->all(),
            '{}'
        );
    }

    /**
     * @return array{uuidShort: string, name: string|null, success: bool, error_code: string, message: string}
     */
    private function failure(string $uuidShort, ?string $name, string $code, string $message): array
    {
        return [
            'uuidShort' => $uuidShort,
            'name' => $name,
            'success' => false,
            'error_code' => $code,
            'message' => $message,
        ];
    }
}
