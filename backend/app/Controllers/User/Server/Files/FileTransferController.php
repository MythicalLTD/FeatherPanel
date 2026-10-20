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

namespace App\Controllers\User\Server\Files;

use App\Chat\Node;
use App\Chat\Server;
use App\Chat\Subuser;
use App\Chat\FileTransfer;
use App\Helpers\UUIDUtils;
use App\SubuserPermissions;
use App\Helpers\ApiResponse;
use App\Helpers\SubuserPermissionChecker;
use App\Services\Files\CrossServerTransfer;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class FileTransferController
{
    /** Servers the user can send files to from this server (file.create on the target). */
    public function targets(Request $request, string $uuidShort): Response
    {
        $user = $request->attributes->get('user');
        $source = Server::getServerByUuidShort($uuidShort);
        if (!$user || !$source) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }
        if (!SubuserPermissionChecker::hasPermission((int) $user['id'], (int) $source['id'], SubuserPermissions::FILE_READ)) {
            return ApiResponse::error('You do not have permission to perform this action', 'PERMISSION_DENIED', 403);
        }

        $servers = [];
        foreach (Server::getServersByOwnerId((int) $user['id']) as $s) {
            $servers[(int) $s['id']] = $s;
        }
        foreach (Subuser::getSubusersByUserId((int) $user['id']) as $sub) {
            $sid = (int) ($sub['server_id'] ?? 0);
            if ($sid > 0 && !isset($servers[$sid]) && ($s = Server::getServerById($sid))) {
                $servers[$sid] = $s;
            }
        }

        $out = [];
        foreach ($servers as $sid => $s) {
            if ($sid === (int) $source['id'] || !SubuserPermissionChecker::hasPermission((int) $user['id'], $sid, SubuserPermissions::FILE_CREATE)) {
                continue;
            }
            $node = Node::getNodeById((int) $s['node_id']);
            $out[] = [
                'uuidShort' => $s['uuidShort'],
                'name' => $s['name'],
                'node' => $node['name'] ?? null,
                'same_node' => (int) $s['node_id'] === (int) $source['node_id'],
            ];
        }
        usort($out, static fn ($a, $b) => strcasecmp((string) $a['name'], (string) $b['name']));

        return ApiResponse::success(['servers' => $out], 'Transfer targets fetched', 200);
    }

    public function create(Request $request, string $uuidShort): Response
    {
        $user = $request->attributes->get('user');
        $source = Server::getServerByUuidShort($uuidShort);
        if (!$user || !$source) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        $mode = ($data['mode'] ?? 'copy') === 'move' ? 'move' : 'copy';
        $root = $this->cleanPath((string) ($data['root'] ?? '/'));
        $destination = $this->cleanPath((string) ($data['destination'] ?? '/'));
        $files = [];
        foreach ((array) ($data['files'] ?? []) as $f) {
            if (is_string($f) && $f !== '' && $f !== '.' && $f !== '..' && !str_contains($f, '/') && !str_contains($f, "\0")) {
                $files[] = $f;
            }
        }
        if ($root === null || $destination === null || $files === [] || count($files) > 500) {
            return ApiResponse::error('Pick at least one file and valid folders', 'INVALID_TRANSFER', 400);
        }

        $target = Server::getServerByUuidShort((string) ($data['target'] ?? ''));
        if (!$target || (int) $target['id'] === (int) $source['id']) {
            return ApiResponse::error('Target server not found', 'TARGET_NOT_FOUND', 404);
        }
        $uid = (int) $user['id'];
        $needed = [SubuserPermissions::FILE_READ, SubuserPermissions::FILE_ARCHIVE];
        if ($mode === 'move') {
            $needed[] = SubuserPermissions::FILE_DELETE;
        }
        if (
            !SubuserPermissionChecker::hasAllPermissions($uid, (int) $source['id'], $needed)
            || !SubuserPermissionChecker::hasPermission($uid, (int) $target['id'], SubuserPermissions::FILE_CREATE)
        ) {
            return ApiResponse::error('You do not have permission to perform this action', 'PERMISSION_DENIED', 403);
        }
        if ((int) ($source['suspended'] ?? 0) === 1 || (int) ($target['suspended'] ?? 0) === 1) {
            return ApiResponse::error('One of the servers is suspended', 'SERVER_SUSPENDED', 409);
        }

        $job = FileTransfer::create([
            'uuid' => UUIDUtils::generateV4(),
            'user_id' => $uid,
            'source_server_id' => (int) $source['id'],
            'target_server_id' => (int) $target['id'],
            'mode' => $mode,
            'source_root' => $root,
            'files' => $files,
            'destination' => $destination,
        ]);
        if (!$job) {
            return ApiResponse::error('Failed to queue the transfer', 'TRANSFER_CREATE_FAILED', 500);
        }

        // Answer right away, then run the transfer after the response is sent.
        ignore_user_abort(true);
        $response = ApiResponse::success(['transfer' => ['uuid' => $job['uuid'], 'status' => 'pending']], 'Transfer started', 202);
        $response->send();
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        } else {
            if (ob_get_level() > 0) {
                ob_end_flush();
            }
            flush();
        }
        CrossServerTransfer::run((string) $job['uuid']);

        return $response;
    }

    public function list(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }

        return ApiResponse::success(['transfers' => FileTransfer::listRecentForUser((int) $user['id'])], 'Transfers fetched', 200);
    }

    private function cleanPath(string $path): ?string
    {
        $path = '/' . trim(str_replace('\\', '/', $path), '/');
        foreach (explode('/', $path) as $seg) {
            if ($seg === '..' || str_contains($seg, "\0")) {
                return null;
            }
        }

        return $path === '' ? '/' : $path;
    }
}
