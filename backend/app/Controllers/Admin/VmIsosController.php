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

use App\Chat\VmIso;
use App\Chat\VmNode;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Services\Vm\IsoLibrary;
use App\Services\Proxmox\Proxmox;
use App\Services\Vm\VmInstanceUtil;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Admin VDS ISO library: provider ISO metadata/visibility and moderation of user ISOs.
 */
#[OA\Tag(name: 'Admin - VDS ISO Library', description: 'Provider ISO library and user ISO moderation')]
class VmIsosController
{
    #[OA\Get(path: '/api/admin/vm-isos', summary: 'List library ISOs', tags: ['Admin - VDS ISO Library'], parameters: [
        new OA\Parameter(name: 'kind', in: 'query', schema: new OA\Schema(type: 'string', enum: ['provider', 'user'])),
        new OA\Parameter(name: 'approval', in: 'query', schema: new OA\Schema(type: 'string', enum: ['approved', 'pending', 'rejected'])),
        new OA\Parameter(name: 'search', in: 'query', schema: new OA\Schema(type: 'string')),
    ], responses: [new OA\Response(response: 200, description: 'ISO rows')])]
    public function index(Request $request): Response
    {
        $kind = (string) $request->query->get('kind', 'provider');
        $approval = $request->query->get('approval');

        return ApiResponse::success([
            'isos' => array_map([self::class, 'serialize'], VmIso::listForAdmin($kind, is_string($approval) && $approval !== '' ? $approval : null, trim((string) $request->query->get('search', '')))),
            'pending_count' => VmIso::countPendingApproval(),
            'categories' => VmIso::CATEGORIES,
            'user_storage' => self::aggregateUserIsoStorages(),
        ], 'ISOs fetched', 200);
    }

    #[OA\Get(path: '/api/admin/vm-isos/scan', summary: 'List ISO files on a VDS node', tags: ['Admin - VDS ISO Library'], parameters: [
        new OA\Parameter(name: 'vm_node_id', in: 'query', required: true, schema: new OA\Schema(type: 'integer')),
    ], responses: [new OA\Response(response: 200, description: 'ISO files')])]
    public function scan(Request $request): Response
    {
        $vmNode = VmNode::getVmNodeById((int) $request->query->get('vm_node_id', 0));
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }
        $nodes = $client->apiGet('/api2/json/nodes');
        if (!$nodes['ok'] || !is_array($nodes['data'])) {
            return ApiResponse::error('Failed to list Proxmox nodes', 'PROXMOX_ERROR', 502);
        }
        $registered = array_column(VmIso::listForAdmin('provider'), 'volid');
        $files = [];
        foreach (array_slice($nodes['data'], 0, 16) as $pve) {
            $pveNode = is_array($pve) ? (string) ($pve['node'] ?? '') : '';
            if ($pveNode === '' || ($pve['status'] ?? 'online') !== 'online') {
                continue;
            }
            $storages = $client->getIsoStorages($pveNode);
            foreach (IsoLibrary::storageIsos($client, $pveNode, $storages['ok'] ? $storages['storage'] : []) as $f) {
                if (isset($files[$f['volid']])) {
                    continue;
                }
                $files[$f['volid']] = $f + [
                    'pve_node' => $pveNode,
                    'registered' => in_array($f['volid'], $registered, true),
                    'user_file' => str_starts_with($f['name'], IsoLibrary::USER_FILE_PREFIX),
                    'category' => IsoLibrary::guessCategory($f['name']),
                ];
            }
        }

        return ApiResponse::success(['files' => array_values($files)], 'ISO files fetched', 200);
    }

    #[OA\Post(path: '/api/admin/vm-isos', summary: 'Add a provider ISO to the library', tags: ['Admin - VDS ISO Library'], responses: [new OA\Response(response: 201, description: 'Created')])]
    public function create(Request $request): Response
    {
        $data = $this->validate($request, true);
        if ($data instanceof Response) {
            return $data;
        }
        $id = VmIso::create($data + ['kind' => 'provider', 'source' => 'library', 'status' => 'ready', 'approval' => 'approved']);
        if ($id === null) {
            return ApiResponse::error('Failed to create ISO entry', 'DB_ERROR', 500);
        }
        $this->log($request, 'vds_iso_create', 'Added ISO to library: ' . $data['name']);

        return ApiResponse::success(['iso' => self::serialize((array) VmIso::getById($id))], 'ISO added', 201);
    }

    #[OA\Patch(path: '/api/admin/vm-isos/{id}', summary: 'Update a library ISO', tags: ['Admin - VDS ISO Library'], parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))], responses: [new OA\Response(response: 200, description: 'Updated')])]
    public function update(Request $request, int $id): Response
    {
        $row = VmIso::getById($id);
        if ($row === null) {
            return ApiResponse::error('ISO not found', 'ISO_NOT_FOUND', 404);
        }
        $data = $this->validate($request, false);
        if ($data instanceof Response) {
            return $data;
        }
        if ($row['kind'] === 'user') {
            // The file location of a user ISO is fixed; only metadata can change.
            $data = array_intersect_key($data, array_flip(['name', 'description', 'category']));
        }
        VmIso::update($id, $data);
        $this->log($request, 'vds_iso_update', 'Updated library ISO #' . $id);

        return ApiResponse::success(['iso' => self::serialize((array) VmIso::getById($id))], 'ISO updated', 200);
    }

    #[OA\Delete(path: '/api/admin/vm-isos/{id}', summary: 'Remove a library entry (user ISOs: also deletes the file)', tags: ['Admin - VDS ISO Library'], parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))], responses: [new OA\Response(response: 200, description: 'Deleted')])]
    public function delete(Request $request, int $id): Response
    {
        $row = VmIso::getById($id);
        if ($row === null) {
            return ApiResponse::error('ISO not found', 'ISO_NOT_FOUND', 404);
        }
        if ($row['kind'] === 'user' && $row['status'] !== 'failed' && !$this->deleteUserFile($row)) {
            return ApiResponse::error('The ISO file could not be deleted from the node', 'PROXMOX_DELETE_FAILED', 502);
        }
        VmIso::delete($id);
        $this->log($request, 'vds_iso_delete', 'Deleted ' . $row['kind'] . ' ISO: ' . $row['name']);

        return ApiResponse::success([], 'ISO deleted', 200);
    }

    #[OA\Post(path: '/api/admin/vm-isos/{id}/approve', summary: 'Approve a user ISO', tags: ['Admin - VDS ISO Library'], parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))], responses: [new OA\Response(response: 200, description: 'Approved')])]
    public function approve(Request $request, int $id): Response
    {
        return $this->moderate($request, $id, 'approved');
    }

    #[OA\Post(path: '/api/admin/vm-isos/{id}/reject', summary: 'Reject a user ISO and delete its file', tags: ['Admin - VDS ISO Library'], parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))], responses: [new OA\Response(response: 200, description: 'Rejected')])]
    public function reject(Request $request, int $id): Response
    {
        return $this->moderate($request, $id, 'rejected');
    }

    public static function serialize(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'kind' => (string) $row['kind'],
            'vm_node_id' => $row['vm_node_id'] !== null ? (int) $row['vm_node_id'] : null,
            'node_name' => $row['node_name'] ?? null,
            'pve_node' => $row['pve_node'] ?? null,
            'storage' => $row['storage'] ?? null,
            'volid' => (string) $row['volid'],
            'file' => IsoLibrary::fileName((string) $row['volid']),
            'name' => (string) $row['name'],
            'description' => $row['description'] ?? null,
            'category' => (string) $row['category'],
            'visible' => (int) $row['visible'] === 1,
            'sort_order' => (int) $row['sort_order'],
            'owner' => isset($row['user_id']) ? ['id' => (int) $row['user_id'], 'username' => $row['owner_username'] ?? null, 'uuid' => $row['owner_uuid'] ?? null] : null,
            'vm_instance_id' => $row['vm_instance_id'] !== null ? (int) $row['vm_instance_id'] : null,
            'vm_hostname' => $row['vm_hostname'] ?? null,
            'source' => (string) $row['source'],
            'source_url' => $row['source_url'] ?? null,
            'size' => (int) $row['size_bytes'],
            'status' => (string) $row['status'],
            'approval' => (string) $row['approval'],
            'error' => $row['error'] ?? null,
            'created_at' => (string) $row['created_at'],
        ];
    }

    private function moderate(Request $request, int $id, string $approval): Response
    {
        $row = VmIso::getById($id);
        if ($row === null || $row['kind'] !== 'user') {
            return ApiResponse::error('User ISO not found', 'ISO_NOT_FOUND', 404);
        }
        if ($approval === 'rejected' && $row['status'] !== 'failed' && !$this->deleteUserFile($row)) {
            return ApiResponse::error('The ISO file could not be deleted from the node', 'PROXMOX_DELETE_FAILED', 502);
        }
        VmIso::update($id, ['approval' => $approval]);
        $this->log($request, 'vds_iso_' . ($approval === 'approved' ? 'approve' : 'reject'), ucfirst($approval) . ' user ISO: ' . $row['name']);

        return ApiResponse::success(['iso' => self::serialize((array) VmIso::getById($id))], 'ISO ' . $approval, 200);
    }

    private function deleteUserFile(array $row): bool
    {
        $vmNode = VmNode::getVmNodeById((int) $row['vm_node_id']);
        if (!$vmNode) {
            return true; // node gone: nothing left to delete
        }
        try {
            /** @var Proxmox $client */
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable) {
            return false;
        }

        return IsoLibrary::deleteVolume($client, (string) $row['pve_node'], (string) $row['volid']);
    }

    /**
     * Human-readable summary of per-node user ISO storages (plus legacy global fallback).
     */
    private static function aggregateUserIsoStorages(): string
    {
        $storages = [];
        foreach (VmNode::getAllVmNodes() as $node) {
            $value = IsoLibrary::userStorage($node);
            if ($value !== '') {
                $storages[$value] = true;
            }
        }
        if ($storages === []) {
            return IsoLibrary::userStorage();
        }

        return implode(', ', array_keys($storages));
    }

    /** @return array<string, mixed>|Response */
    private function validate(Request $request, bool $creating): array | Response
    {
        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }
        $out = [];
        if ($creating || array_key_exists('volid', $body)) {
            $volid = trim((string) ($body['volid'] ?? ''));
            if (!preg_match('/^[A-Za-z0-9._-]+:iso\/[^\/\s]+\.iso$/i', $volid)) {
                return ApiResponse::error('volid must look like storage:iso/file.iso', 'INVALID_VOLID', 400);
            }
            $out['volid'] = $volid;
            $out['storage'] = substr($volid, 0, (int) strpos($volid, ':'));
        }
        if ($creating || array_key_exists('name', $body)) {
            $name = trim(strip_tags((string) ($body['name'] ?? '')));
            if ($name === '' || mb_strlen($name) > 120) {
                return ApiResponse::error('Name is required (max 120 characters)', 'INVALID_NAME', 400);
            }
            $out['name'] = $name;
        }
        if (array_key_exists('description', $body)) {
            $desc = trim(strip_tags((string) $body['description']));
            $out['description'] = $desc !== '' ? mb_substr($desc, 0, 500) : null;
        }
        if (array_key_exists('category', $body)) {
            if (!in_array($body['category'], VmIso::CATEGORIES, true)) {
                return ApiResponse::error('Invalid category', 'INVALID_CATEGORY', 400);
            }
            $out['category'] = $body['category'];
        }
        if (array_key_exists('vm_node_id', $body)) {
            $nodeId = $body['vm_node_id'] === null || $body['vm_node_id'] === '' ? null : (int) $body['vm_node_id'];
            if ($nodeId !== null && !VmNode::getVmNodeById($nodeId)) {
                return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
            }
            $out['vm_node_id'] = $nodeId;
        }
        if (array_key_exists('pve_node', $body)) {
            $out['pve_node'] = mb_substr(trim((string) $body['pve_node']), 0, 64) ?: null;
        }
        if (array_key_exists('visible', $body)) {
            $out['visible'] = filter_var($body['visible'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        }
        if (array_key_exists('sort_order', $body)) {
            $out['sort_order'] = max(0, min(100000, (int) $body['sort_order']));
        }

        return $out;
    }

    private function log(Request $request, string $name, string $context): void
    {
        $admin = $request->attributes->get('user');
        Activity::createActivity([
            'user_uuid' => is_array($admin) ? ($admin['uuid'] ?? null) : null,
            'name' => $name,
            'context' => $context,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);
    }
}
