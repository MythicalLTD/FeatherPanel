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

namespace App\Controllers\Quilld;

use App\Chat\WebSpace;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Daemon pull endpoints for WebSpaces (Wings-style).
 */
class FeatherQuilldWebSpaceController
{
    public function getWebSpace(Request $request, string $uuid): Response
    {
        $webNode = $request->attributes->get('quilld_node');
        if (!is_array($webNode)) {
            return ApiResponse::error('Invalid FeatherQuilld authentication', 'INVALID_QUILLD_AUTH', 403);
        }

        $space = WebSpace::getByUuidAndNodeId($uuid, (int) $webNode['id']);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        return ApiResponse::success(WebSpace::toDaemonConfig($space), 'OK', 200);
    }

    public function getInstall(Request $request, string $uuid): Response
    {
        $webNode = $request->attributes->get('quilld_node');
        if (!is_array($webNode)) {
            return ApiResponse::error('Invalid FeatherQuilld authentication', 'INVALID_QUILLD_AUTH', 403);
        }

        $space = WebSpace::getByUuidAndNodeId($uuid, (int) $webNode['id']);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $install = WebSpace::toInstallConfig($space);
        if ($install === null) {
            return ApiResponse::error('WebPlate not found for WebSpace', 'WEBPLATE_NOT_FOUND', 404);
        }

        // Match Wings: raw install object (no envelope) so daemons can parse either style.
        return ApiResponse::sendManualResponse($install, 200);
    }

    public function patchWebSpace(Request $request, string $uuid): Response
    {
        $webNode = $request->attributes->get('quilld_node');
        if (!is_array($webNode)) {
            return ApiResponse::error('Invalid FeatherQuilld authentication', 'INVALID_QUILLD_AUTH', 403);
        }

        $space = WebSpace::getByUuidAndNodeId($uuid, (int) $webNode['id']);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $state = isset($content['state']) ? trim((string) $content['state']) : null;
        $backendPort = array_key_exists('backend_port', $content) ? (int) $content['backend_port'] : null;

        if ($state === null && $backendPort === null) {
            return ApiResponse::error('state or backend_port is required', 'MISSING_FIELDS', 400);
        }

        $nextState = $state !== null && $state !== '' ? $state : (string) ($space['state'] ?? 'stopped');
        if (!WebSpace::updateRuntimeState($uuid, $nextState, $backendPort)) {
            return ApiResponse::error('Failed to update WebSpace', 'UPDATE_FAILED', 500);
        }

        $updated = WebSpace::getByUuid($uuid);

        return ApiResponse::success($updated, 'OK', 200);
    }

    public function postInstall(Request $request, string $uuid): Response
    {
        $webNode = $request->attributes->get('quilld_node');
        if (!is_array($webNode)) {
            return ApiResponse::error('Invalid FeatherQuilld authentication', 'INVALID_QUILLD_AUTH', 403);
        }

        $space = WebSpace::getByUuidAndNodeId($uuid, (int) $webNode['id']);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content) || !array_key_exists('successful', $content)) {
            return ApiResponse::error('Missing required field: successful', 'MISSING_FIELD', 400);
        }

        $successful = (bool) $content['successful'];
        $reinstall = (bool) ($content['reinstall'] ?? false);

        $status = 'installed';
        if (!$successful) {
            $status = $reinstall ? 'reinstall_failed' : 'installation_failed';
        }

        if (!WebSpace::updateStatus($uuid, $status)) {
            return ApiResponse::error('Failed to update WebSpace status', 'UPDATE_FAILED', 500);
        }

        return new Response('', 204);
    }

    /**
     * POST /api/quilld-remote/webspaces/{uuid}/acme-dns
     * Body: { action: set|clear, name: "_acme-challenge.example.com", content: "<digest>" }.
     */
    public function acmeDns(Request $request, string $uuid): Response
    {
        $webNode = $request->attributes->get('quilld_node');
        if (!is_array($webNode)) {
            return ApiResponse::error('Invalid FeatherQuilld authentication', 'INVALID_QUILLD_AUTH', 403);
        }

        $space = WebSpace::getByUuidAndNodeId($uuid, (int) $webNode['id']);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $action = strtolower(trim((string) ($content['action'] ?? '')));
        $name = strtolower(trim((string) ($content['name'] ?? '')));
        $txt = trim((string) ($content['content'] ?? ''));
        if (!in_array($action, ['set', 'clear'], true) || $name === '') {
            return ApiResponse::error('action (set|clear) and name are required', 'MISSING_FIELDS', 400);
        }
        if ($action === 'set' && $txt === '') {
            return ApiResponse::error('content is required for set', 'MISSING_FIELDS', 400);
        }

        $context = \App\Helpers\DnsProvisioner::resolveProvisionerContext($space);
        if ($context === null) {
            return ApiResponse::error(
                'No DNS zone linked for this WebSpace',
                'DNS_NOT_CONFIGURED',
                400
            );
        }

        $provider = $context['provider'];
        $zoneId = (string) $context['zone_id'];
        if (!$provider instanceof \App\Services\Dns\AcmeDnsCapableInterface) {
            return ApiResponse::error('DNS provider does not support ACME TXT', 'DNS_UNSUPPORTED', 400);
        }

        if ($action === 'set') {
            $result = $provider->createTxtRecord($zoneId, $name, $txt);
            if (empty($result['ok'])) {
                return ApiResponse::error($result['error'] ?? 'Failed to create TXT', 'DNS_TXT_FAILED', 502);
            }

            return ApiResponse::success(['action' => 'set', 'name' => $name], 'OK', 200);
        }

        $result = $provider->deleteTxtRecords($zoneId, $name, $txt !== '' ? $txt : null);
        if (empty($result['ok'])) {
            return ApiResponse::error($result['error'] ?? 'Failed to clear TXT', 'DNS_TXT_FAILED', 502);
        }

        return ApiResponse::success(['action' => 'clear', 'name' => $name, 'deleted' => $result['deleted'] ?? 0], 'OK', 200);
    }
}
