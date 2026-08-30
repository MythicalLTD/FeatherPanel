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

namespace App\Controllers\System;

use App\Chat\WebNode;
use App\Chat\WebSpace;
use App\Helpers\ApiResponse;
use App\Helpers\FeatherQuilldClient;
use App\Helpers\WebSpaceGitDeployer;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Public HMAC-signed Git deploy webhook (GitHub-compatible X-Hub-Signature-256).
 */
class WebSpaceGitWebhookController
{
    public function deploy(Request $request, string $uuid): Response
    {
        if (!WebSpace::isValidUuid($uuid)) {
            return ApiResponse::error('Invalid uuid', 'INVALID_UUID', 400);
        }

        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $read = FeatherQuilldClient::getWebSpaceFileContents($webNode, $uuid, '.featherquilld/git-deploy.json');
        if (!$read['ok']) {
            return ApiResponse::error('Git webhook is not configured', 'WEBHOOK_NOT_CONFIGURED', 404);
        }
        $body = $read['body'];
        $rawConfig = is_string($body) ? $body : (is_array($body) ? (string) ($body['data'] ?? $body['contents'] ?? '') : '');
        $config = json_decode($rawConfig, true);
        if (!is_array($config) || empty($config['secret']) || empty($config['repo'])) {
            return ApiResponse::error('Git webhook is not configured', 'WEBHOOK_NOT_CONFIGURED', 404);
        }

        $payload = $request->getContent();
        $signature = (string) ($request->headers->get('X-Hub-Signature-256')
            ?? $request->headers->get('X-Feather-Signature')
            ?? '');
        $secret = (string) $config['secret'];
        if ($signature === '' || !$this->signatureValid($payload, $signature, $secret)) {
            return ApiResponse::error('Invalid webhook signature', 'INVALID_SIGNATURE', 401);
        }

        // Optional: only deploy on push to the configured ref.
        $event = strtolower((string) ($request->headers->get('X-GitHub-Event') ?? 'push'));
        if ($event !== '' && $event !== 'push' && $event !== 'ping') {
            return ApiResponse::success(['ignored' => true, 'event' => $event], 'Ignored event', 200);
        }
        if ($event === 'ping') {
            return ApiResponse::success(['ok' => true], 'pong', 200);
        }

        try {
            $result = WebSpaceGitDeployer::deployFromStored($space, $webNode, $config);
        } catch (\Throwable $e) {
            return ApiResponse::error($e->getMessage(), 'GIT_DEPLOY_FAILED', 502);
        }

        return ApiResponse::success($result, 'Deployed', 200);
    }

    private function signatureValid(string $payload, string $header, string $secret): bool
    {
        $header = trim($header);
        if (str_starts_with(strtolower($header), 'sha256=')) {
            $provided = substr($header, 7);
            $expected = hash_hmac('sha256', $payload, $secret);

            return hash_equals($expected, $provided);
        }

        // Plain shared secret fallback (X-Feather-Signature: <secret>)
        return hash_equals($secret, $header);
    }
}
