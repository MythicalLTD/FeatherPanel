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

use App\Chat\Node;
use App\Chat\WebNode;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\NodeMetricsSetting;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use App\Observability\NodeDaemonObservability;
use Symfony\Component\HttpFoundation\Response;

/**
 * Node status and live metrics read from the daemons' /health/ready and /metrics
 * endpoints, for game nodes (FeatherWings) and web nodes (FeatherQuilld).
 */
class NodeDaemonMetricsController
{
    private const MAX_BATCH = 100;

    #[OA\Get(
        path: '/api/admin/nodes/daemon-health',
        summary: 'Health status of many game nodes',
        description: 'Reads /health/ready of each node daemon (cached for 20 seconds). Pass ids=1,2,3 or omit for every node (up to 100).',
        tags: ['Admin - Node Metrics'],
        parameters: [new OA\Parameter(name: 'ids', in: 'query', required: false, schema: new OA\Schema(type: 'string'))],
        responses: [new OA\Response(response: 200, description: 'node id => status')]
    )]
    public function wingsSummaries(Request $request): Response
    {
        return $this->summaries(NodeMetricsSetting::KIND_WINGS, $request);
    }

    #[OA\Get(
        path: '/api/admin/web-nodes/daemon-health',
        summary: 'Health status of many web nodes',
        tags: ['Admin - Node Metrics'],
        parameters: [new OA\Parameter(name: 'ids', in: 'query', required: false, schema: new OA\Schema(type: 'string'))],
        responses: [new OA\Response(response: 200, description: 'node id => status')]
    )]
    public function webSummaries(Request $request): Response
    {
        return $this->summaries(NodeMetricsSetting::KIND_WEB, $request);
    }

    #[OA\Get(
        path: '/api/admin/nodes/{id}/daemon-health',
        summary: 'Health checks and live metrics of a game node',
        description: 'Health checks from /health/ready, a summary of the daemon Prometheus metrics and host utilization. Cached for 20 seconds; refresh=1 skips the cache when it is older than 5 seconds.',
        tags: ['Admin - Node Metrics'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'refresh', in: 'query', required: false, schema: new OA\Schema(type: 'boolean')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Report'),
            new OA\Response(response: 404, description: 'Node not found'),
        ]
    )]
    public function wingsReport(Request $request, int $id): Response
    {
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        return ApiResponse::success(
            NodeDaemonObservability::report(NodeMetricsSetting::KIND_WINGS, $node, $this->wantsRefresh($request)),
            'Node daemon health loaded'
        );
    }

    #[OA\Get(
        path: '/api/admin/web-nodes/{id}/daemon-health',
        summary: 'Health checks and live metrics of a web node',
        tags: ['Admin - Node Metrics'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'refresh', in: 'query', required: false, schema: new OA\Schema(type: 'boolean')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Report'),
            new OA\Response(response: 404, description: 'Web node not found'),
        ]
    )]
    public function webReport(Request $request, int $id): Response
    {
        $node = WebNode::getWebNodeById($id);
        if (!$node) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        return ApiResponse::success(
            NodeDaemonObservability::report(NodeMetricsSetting::KIND_WEB, $node, $this->wantsRefresh($request)),
            'Web node daemon health loaded'
        );
    }

    #[OA\Get(
        path: '/api/admin/nodes/{id}/daemon-metrics-settings',
        summary: 'Metrics settings of a game node (the token is never returned)',
        tags: ['Admin - Node Metrics'],
        responses: [new OA\Response(response: 200, description: 'Settings')]
    )]
    public function wingsSettings(Request $request, int $id): Response
    {
        if (!Node::getNodeById($id)) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        return ApiResponse::success(NodeMetricsSetting::publicView(NodeMetricsSetting::KIND_WINGS, $id), 'Settings loaded');
    }

    #[OA\Get(
        path: '/api/admin/web-nodes/{id}/daemon-metrics-settings',
        summary: 'Metrics settings of a web node (the token is never returned)',
        tags: ['Admin - Node Metrics'],
        responses: [new OA\Response(response: 200, description: 'Settings')]
    )]
    public function webSettings(Request $request, int $id): Response
    {
        if (!WebNode::getWebNodeById($id)) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        return ApiResponse::success(NodeMetricsSetting::publicView(NodeMetricsSetting::KIND_WEB, $id), 'Settings loaded');
    }

    #[OA\Patch(
        path: '/api/admin/nodes/{id}/daemon-metrics-settings',
        summary: 'Update metrics settings of a game node',
        description: 'metrics_url: full URL of the metrics endpoint when the daemon serves it on a dedicated listener (empty = node API /metrics). metrics_token: the daemon scrape token; omit to keep, empty string to clear.',
        tags: ['Admin - Node Metrics'],
        responses: [
            new OA\Response(response: 200, description: 'Saved'),
            new OA\Response(response: 422, description: 'Invalid value'),
        ]
    )]
    public function wingsUpdateSettings(Request $request, int $id): Response
    {
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        return $this->updateSettings(NodeMetricsSetting::KIND_WINGS, $request, $node);
    }

    #[OA\Patch(
        path: '/api/admin/web-nodes/{id}/daemon-metrics-settings',
        summary: 'Update metrics settings of a web node',
        tags: ['Admin - Node Metrics'],
        responses: [
            new OA\Response(response: 200, description: 'Saved'),
            new OA\Response(response: 422, description: 'Invalid value'),
        ]
    )]
    public function webUpdateSettings(Request $request, int $id): Response
    {
        $node = WebNode::getWebNodeById($id);
        if (!$node) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        return $this->updateSettings(NodeMetricsSetting::KIND_WEB, $request, $node);
    }

    private function summaries(string $kind, Request $request): Response
    {
        $ids = [];
        $raw = (string) $request->query->get('ids', '');
        if ($raw !== '') {
            foreach (explode(',', $raw) as $part) {
                $part = trim($part);
                if ($part !== '' && ctype_digit($part) && (int) $part > 0) {
                    $ids[(int) $part] = true;
                }
            }
            if ($ids === []) {
                return ApiResponse::error('ids must be a comma separated list of node IDs', 'INVALID_IDS', 400);
            }
            if (count($ids) > self::MAX_BATCH) {
                return ApiResponse::error('At most ' . self::MAX_BATCH . ' nodes per request', 'TOO_MANY_IDS', 400);
            }
        }

        $all = $kind === NodeMetricsSetting::KIND_WINGS ? Node::getAllNodes() : WebNode::getAllWebNodes();
        $nodes = [];
        foreach ($all as $node) {
            $id = (int) ($node['id'] ?? 0);
            if ($ids === [] || isset($ids[$id])) {
                $nodes[] = $node;
            }
            if (count($nodes) >= self::MAX_BATCH) {
                break;
            }
        }

        $summaries = NodeDaemonObservability::healthSummaries($kind, $nodes);
        $out = [];
        foreach ($summaries as $id => $summary) {
            $out[(string) $id] = $summary;
        }

        return ApiResponse::success(['nodes' => $out], 'Node daemon health loaded');
    }

    /**
     * @param array<string, mixed> $node
     */
    private function updateSettings(string $kind, Request $request, array $node): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }

        $id = (int) $node['id'];
        $current = NodeMetricsSetting::get($kind, $id);

        $url = $current['metrics_url'];
        if (array_key_exists('metrics_url', $data)) {
            if ($data['metrics_url'] !== null && !is_string($data['metrics_url'])) {
                return ApiResponse::error('metrics_url must be a string', 'INVALID_METRICS_URL', 422);
            }
            $url = $data['metrics_url'] === null ? null : trim($data['metrics_url']);
            if ($url !== null && $url !== '') {
                $error = NodeMetricsSetting::validateUrl($url);
                if ($error !== null) {
                    return ApiResponse::error($error, 'INVALID_METRICS_URL', 422);
                }
            }
        }

        $token = null;
        if (array_key_exists('metrics_token', $data)) {
            if ($data['metrics_token'] !== null && !is_string($data['metrics_token'])) {
                return ApiResponse::error('metrics_token must be a string', 'INVALID_METRICS_TOKEN', 422);
            }
            if (is_string($data['metrics_token'])) {
                $token = trim($data['metrics_token']);
                if (strlen($token) > 512 || preg_match('/[\r\n\s]/', $token)) {
                    return ApiResponse::error('metrics_token must be at most 512 characters without whitespace', 'INVALID_METRICS_TOKEN', 422);
                }
            }
        }

        try {
            $saved = NodeMetricsSetting::save($kind, $id, $url, $token);
        } catch (\Throwable) {
            $saved = false;
        }
        if (!$saved) {
            return ApiResponse::error('Failed to save metrics settings', 'METRICS_SETTINGS_SAVE_FAILED', 500);
        }
        NodeDaemonObservability::forget($kind, $id);

        $changes = [];
        if (array_key_exists('metrics_url', $data)) {
            $changes[] = 'metrics URL ' . (($url ?? '') === '' ? 'cleared' : 'set');
        }
        if ($token !== null) {
            $changes[] = 'metrics token ' . ($token === '' ? 'cleared' : 'updated');
        }
        try {
            Activity::createActivity([
                'user_uuid' => $request->attributes->get('user')['uuid'] ?? null,
                'name' => $kind === NodeMetricsSetting::KIND_WINGS ? 'update_node_metrics_settings' : 'update_web_node_metrics_settings',
                'context' => 'Updated metrics settings of node ' . (string) ($node['name'] ?? $id) . ($changes !== [] ? ': ' . implode(', ', $changes) : ''),
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);
        } catch (\Throwable) {
        }

        return ApiResponse::success(NodeMetricsSetting::publicView($kind, $id), 'Metrics settings saved');
    }

    private function wantsRefresh(Request $request): bool
    {
        return filter_var($request->query->get('refresh', false), FILTER_VALIDATE_BOOLEAN);
    }
}
