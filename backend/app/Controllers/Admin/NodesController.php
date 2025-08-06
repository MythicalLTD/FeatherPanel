<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\Admin;

use App\App;
use App\Chat\Node;
use App\Chat\Activity;
use App\Chat\Location;
use App\Helpers\ApiResponse;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class NodesController
{
    public function index(Request $request): Response
    {
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);
        $search = $request->query->get('search', '');

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $offset = ($page - 1) * $limit;
        $nodes = Node::searchNodes($page, $limit, $search);
        $total = Node::getNodesCount($search);

        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'nodes' => $nodes,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
                'from' => $from,
                'to' => $to,
            ],
            'search' => [
                'query' => $search,
                'has_results' => count($nodes) > 0,
            ],
        ], 'Nodes fetched successfully', 200);
    }

    public function show(Request $request, int $id): Response
    {
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        return ApiResponse::success(['node' => $node], 'Node fetched successfully', 200);
    }

    public function create(Request $request): Response
    {
        $logger = App::getInstance(true)->getLogger();
        $admin = $request->get('user');
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }
        $requiredFields = ['name', 'fqdn', 'location_id'];
        $errors = Node::validateNodeData($data, $requiredFields);
        if (!empty($errors)) {
            return ApiResponse::error(implode('; ', $errors), 'NODE_VALIDATION_FAILED', 400);
        }
        // Generate UUID and tokens for the node
        $data['uuid'] = Node::generateUuid();
        $data['daemon_token_id'] = Node::generateDaemonTokenId();
        $data['daemon_token'] = Node::generateDaemonToken();

        $locationId = $data['location_id'] ?? null;
        if (!$locationId || !is_numeric($locationId) || !Location::getById((int) $locationId)) {
            return ApiResponse::error('Location does not exist', 'LOCATION_NOT_FOUND', 400);
        }
        $data['location_id'] = (int) $locationId;

        // Check for duplicate UUID
        if (Node::getNodeByUuid($data['uuid'])) {
            return ApiResponse::error('Node with this UUID already exists', 'UUID_ALREADY_EXISTS', 400);
        }

        $nodeId = Node::createNode($data);
        if (!$nodeId) {
            return ApiResponse::error('Failed to create node', 'NODE_CREATE_FAILED', 400);
        }

        $node = Node::getNodeById($nodeId);
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'create_node',
            'context' => 'Created node: ' . $node['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['node' => $node], 'Node created successfully', 201);
    }

    public function update(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }
        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }
        if (isset($data['id'])) {
            unset($data['id']);
        }
        $locationId = $data['location_id'] ?? null;
        if (!$locationId || !is_numeric($locationId) || !Location::getById((int) $locationId)) {
            return ApiResponse::error('Location does not exist', 'LOCATION_NOT_FOUND', 400);
        }
        $data['location_id'] = (int) $locationId;

        $requiredFields = ['name', 'fqdn', 'location_id'];
        $errors = Node::validateNodeData($data, $requiredFields);
        if (!empty($errors)) {
            return ApiResponse::error(implode('; ', $errors), 'NODE_VALIDATION_FAILED', 400);
        }
        if (isset($data['uuid']) && !Node::isValidUuid($data['uuid'])) {
            return ApiResponse::error('Invalid UUID format', 'INVALID_UUID', 400);
        }
        $success = Node::updateNodeById($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update node', 'NODE_UPDATE_FAILED', 400);
        }
        $node = Node::getNodeById($id);
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'update_node',
            'context' => 'Updated node: ' . $node['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['node' => $node], 'Node updated successfully', 200);
    }

    public function delete(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }
        $success = Node::hardDeleteNode($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete node', 'NODE_DELETE_FAILED', 400);
        }
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'delete_node',
            'context' => 'Deleted node: ' . $node['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Node deleted successfully', 200);
    }

    public function resetKey(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        // Generate new daemon tokens
        $data = [
            'daemon_token_id' => Node::generateDaemonTokenId(),
            'daemon_token' => Node::generateDaemonToken(),
        ];

        $success = Node::updateNodeById($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update node tokens', 'NODE_UPDATE_FAILED', 400);
        }

        // Get updated node data
        $updatedNode = Node::getNodeById($id);

        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'reset_node_key',
            'context' => 'Reset daemon tokens for node: ' . $node['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['node' => $updatedNode], 'Master daemon reset key generated successfully', 200);
    }
}
