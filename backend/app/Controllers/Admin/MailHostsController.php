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

namespace App\Controllers\Admin;

use App\Chat\WebNode;
use App\Chat\MailHost;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class MailHostsController
{
    #[OA\Get(path: '/api/admin/mail-hosts', summary: 'List mail hosts', tags: ['Admin - Mail Hosts'])]
    public function index(Request $request): Response
    {
        $hosts = MailHost::listAll();
        foreach ($hosts as &$host) {
            if (!empty($host['provision_api_key'])) {
                $host['provision_api_key'] = '[REDACTED]';
            }
        }
        unset($host);

        return ApiResponse::success(['hosts' => $hosts], 'OK', 200);
    }

    #[OA\Get(path: '/api/admin/mail-hosts/{id}', summary: 'Show mail host', tags: ['Admin - Mail Hosts'])]
    public function show(Request $request, int $id): Response
    {
        $host = MailHost::getById($id);
        if (!$host) {
            return ApiResponse::error('Mail host not found', 'NOT_FOUND', 404);
        }

        if (!empty($host['provision_api_key'])) {
            $host['provision_api_key'] = '[REDACTED]';
        }

        return ApiResponse::success(['host' => $host], 'OK', 200);
    }

    #[OA\Put(path: '/api/admin/mail-hosts', summary: 'Create mail host', tags: ['Admin - Mail Hosts'])]
    public function create(Request $request): Response
    {
        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $error = $this->validate($body, true);
        if ($error !== null) {
            return $error;
        }

        $id = MailHost::create($body);
        if ($id === false) {
            return ApiResponse::error('Failed to create mail host', 'CREATE_FAILED', 500);
        }

        $host = MailHost::getById($id);
        if ($host && !empty($host['provision_api_key'])) {
            $host['provision_api_key'] = '[REDACTED]';
        }

        return ApiResponse::success(['host' => $host], 'Created', 201);
    }

    #[OA\Patch(path: '/api/admin/mail-hosts/{id}', summary: 'Update mail host', tags: ['Admin - Mail Hosts'])]
    public function update(Request $request, int $id): Response
    {
        $existing = MailHost::getById($id);
        if (!$existing) {
            return ApiResponse::error('Mail host not found', 'NOT_FOUND', 404);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $error = $this->validate($body, false);
        if ($error !== null) {
            return $error;
        }

        if (!MailHost::update($id, $body)) {
            return ApiResponse::error('Failed to update mail host', 'UPDATE_FAILED', 500);
        }

        $host = MailHost::getById($id);
        if ($host && !empty($host['provision_api_key'])) {
            $host['provision_api_key'] = '[REDACTED]';
        }

        return ApiResponse::success(['host' => $host], 'Updated', 200);
    }

    #[OA\Delete(path: '/api/admin/mail-hosts/{id}', summary: 'Delete mail host', tags: ['Admin - Mail Hosts'])]
    public function delete(Request $request, int $id): Response
    {
        $existing = MailHost::getById($id);
        if (!$existing) {
            return ApiResponse::error('Mail host not found', 'NOT_FOUND', 404);
        }

        if (!MailHost::delete($id)) {
            return ApiResponse::error('Failed to delete mail host (it may still be in use)', 'DELETE_FAILED', 500);
        }

        return ApiResponse::success([], 'Deleted', 200);
    }

    /**
     * @param array<string, mixed> $body
     */
    private function validate(array $body, bool $creating): ?Response
    {
        if ($creating) {
            foreach (['name', 'hostname', 'imap_host', 'smtp_host'] as $field) {
                if (trim((string) ($body[$field] ?? '')) === '') {
                    return ApiResponse::error($field . ' is required', 'VALIDATION_FAILED', 400);
                }
            }
        }

        if (isset($body['web_node_id']) && (int) $body['web_node_id'] > 0) {
            if (!WebNode::getWebNodeById((int) $body['web_node_id'])) {
                return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
            }
        }

        if (isset($body['provision_mode'])) {
            $mode = strtolower(trim((string) $body['provision_mode']));
            if (!in_array($mode, ['inventory', 'webhook'], true)) {
                return ApiResponse::error('provision_mode must be inventory or webhook', 'VALIDATION_FAILED', 400);
            }
            if ($mode === 'webhook' && trim((string) ($body['provision_url'] ?? ($creating ? '' : 'x'))) === '' && $creating) {
                return ApiResponse::error('provision_url is required for webhook mode', 'VALIDATION_FAILED', 400);
            }
        }

        return null;
    }
}
