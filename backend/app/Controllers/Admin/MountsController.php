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
use App\Chat\Mount;
use App\Chat\Spell;
use App\Chat\Server;
use App\Permissions;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Helpers\PermissionHelper;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Tag(name: 'Admin - Mounts', description: 'Wings bind mounts (host paths into containers)')]
class MountsController
{
    #[OA\Get(path: '/api/admin/mounts', summary: 'List mounts', tags: ['Admin - Mounts'])]
    public function index(Request $request): Response
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = max(1, min(100, (int) $request->query->get('limit', 50)));
        $search = (string) $request->query->get('search', '');
        $sortBy = (string) $request->query->get('sort_by', 'id');
        $sortOrder = (string) $request->query->get('sort_order', 'ASC');
        $total = Mount::getMountsCount($search);
        $rows = Mount::searchMounts($page, $limit, $search, $sortBy, $sortOrder);
        foreach ($rows as &$r) {
            $r = self::enrichMount($r);
        }
        unset($r);
        $totalPages = $limit > 0 ? (int) ceil($total / $limit) : 1;

        return ApiResponse::success([
            'mounts' => $rows,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
                'from' => $total > 0 ? ($page - 1) * $limit + 1 : 0,
                'to' => min(($page - 1) * $limit + count($rows), $total),
            ],
        ], 'Mounts fetched successfully', 200);
    }

    #[OA\Get(path: '/api/admin/mounts/{id}', summary: 'Get mount', tags: ['Admin - Mounts'])]
    public function show(Request $request, int $id): Response
    {
        $m = Mount::getMountById($id);
        if (!$m) {
            return ApiResponse::error('Mount not found', 'MOUNT_NOT_FOUND', 404);
        }

        return ApiResponse::success(['mount' => self::enrichMount($m)], 'Mount fetched successfully', 200);
    }

    #[OA\Put(path: '/api/admin/mounts', summary: 'Create mount', tags: ['Admin - Mounts'])]
    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON', 'INVALID_JSON', 400);
        }
        $name = isset($data['name']) ? trim((string) $data['name']) : '';
        if (strlen($name) < 2 || strlen($name) > 64) {
            return ApiResponse::error('Name must be between 2 and 64 characters', 'VALIDATION_ERROR', 400);
        }
        if (Mount::getMountByName($name)) {
            return ApiResponse::error('A mount with this name already exists', 'MOUNT_NAME_EXISTS', 409);
        }
        $paths = self::validatedStoragePaths((string) ($data['source'] ?? ''), (string) ($data['target'] ?? ''));
        if ($paths['error'] !== null) {
            return ApiResponse::error($paths['error'], 'VALIDATION_ERROR', 400);
        }
        $desc = $data['description'] ?? null;
        if ($desc !== null && !is_string($desc)) {
            return ApiResponse::error('Description must be a string', 'VALIDATION_ERROR', 400);
        }
        if (is_string($desc) && strlen($desc) > 65535) {
            return ApiResponse::error('Description is too long', 'VALIDATION_ERROR', 400);
        }
        $userMountable = true;
        if (array_key_exists('user_mountable', $data)) {
            $parsedUm = self::requestBoolean($data['user_mountable']);
            if ($parsedUm === null) {
                return ApiResponse::error('user_mountable must be a boolean', 'VALIDATION_ERROR', 400);
            }
            $userMountable = $parsedUm;
        }
        $readOnly = false;
        if (array_key_exists('read_only', $data)) {
            $parsedRo = self::requestBoolean($data['read_only']);
            if ($parsedRo === null) {
                return ApiResponse::error('read_only must be a boolean', 'VALIDATION_ERROR', 400);
            }
            $readOnly = $parsedRo;
        }
        $newId = Mount::createMount([
            'name' => $name,
            'description' => $desc,
            'source' => $paths['source'],
            'target' => $paths['target'],
            'read_only' => $readOnly,
            'user_mountable' => $userMountable,
        ]);
        if ($newId === false) {
            return ApiResponse::error('Failed to create mount', 'CREATE_FAILED', 500);
        }
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'],
            'name' => 'create_mount',
            'context' => 'Created mount: ' . $name,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['mount_id' => $newId], 'Mount created successfully', 201);
    }

    #[OA\Patch(path: '/api/admin/mounts/{id}', summary: 'Update mount', tags: ['Admin - Mounts'])]
    public function update(Request $request, int $id): Response
    {
        $m = Mount::getMountById($id);
        if (!$m) {
            return ApiResponse::error('Mount not found', 'MOUNT_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON', 'INVALID_JSON', 400);
        }
        $update = [];
        if (isset($data['name'])) {
            $name = trim((string) $data['name']);
            if (strlen($name) < 2 || strlen($name) > 64) {
                return ApiResponse::error('Name must be between 2 and 64 characters', 'VALIDATION_ERROR', 400);
            }
            $existing = Mount::getMountByName($name);
            if ($existing && (int) $existing['id'] !== $id) {
                return ApiResponse::error('A mount with this name already exists', 'MOUNT_NAME_EXISTS', 409);
            }
            $update['name'] = $name;
        }
        if (array_key_exists('description', $data)) {
            $d = $data['description'];
            if ($d !== null && !is_string($d)) {
                return ApiResponse::error('Description must be a string or null', 'VALIDATION_ERROR', 400);
            }
            $update['description'] = $d;
        }
        $source = $data['source'] ?? $m['source'];
        $target = $data['target'] ?? $m['target'];
        if (isset($data['source']) || isset($data['target'])) {
            $paths = self::validatedStoragePaths((string) $source, (string) $target);
            if ($paths['error'] !== null) {
                return ApiResponse::error($paths['error'], 'VALIDATION_ERROR', 400);
            }
            $update['source'] = $paths['source'];
            $update['target'] = $paths['target'];
        }
        if (array_key_exists('read_only', $data)) {
            $parsedRo = self::requestBoolean($data['read_only']);
            if ($parsedRo === null) {
                return ApiResponse::error('read_only must be a boolean', 'VALIDATION_ERROR', 400);
            }
            $update['read_only'] = $parsedRo;
        }
        if (array_key_exists('user_mountable', $data)) {
            $parsedUm = self::requestBoolean($data['user_mountable']);
            if ($parsedUm === null) {
                return ApiResponse::error('user_mountable must be a boolean', 'VALIDATION_ERROR', 400);
            }
            $update['user_mountable'] = $parsedUm;
        }
        if ($update === []) {
            return ApiResponse::error('No valid fields to update', 'NO_DATA', 400);
        }
        if (!Mount::updateMountById($id, $update)) {
            return ApiResponse::error('Failed to update mount', 'UPDATE_FAILED', 500);
        }
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'],
            'name' => 'update_mount',
            'context' => 'Updated mount ID ' . $id,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['mount' => self::enrichMount(Mount::getMountById($id) ?? [])], 'Mount updated successfully', 200);
    }

    #[OA\Delete(path: '/api/admin/mounts/{id}', summary: 'Delete mount', tags: ['Admin - Mounts'])]
    public function delete(Request $request, int $id): Response
    {
        if (!Mount::getMountById($id)) {
            return ApiResponse::error('Mount not found', 'MOUNT_NOT_FOUND', 404);
        }
        if (Mount::countServersForMount($id) > 0) {
            return ApiResponse::error('Detach this mount from all servers before deleting it', 'MOUNT_HAS_SERVERS', 409);
        }
        if (!Mount::deleteMountById($id)) {
            return ApiResponse::error('Failed to delete mount', 'DELETE_FAILED', 500);
        }
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'],
            'name' => 'delete_mount',
            'context' => 'Deleted mount ID ' . $id,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Mount deleted successfully', 200);
    }

    public function setNodes(Request $request, int $id): Response
    {
        return $this->replaceLinks($request, $id, Mount::MOUNTABLE_NODE, 'node_ids');
    }

    public function setSpells(Request $request, int $id): Response
    {
        $user = $request->get('user');
        if (!PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SPELLS_EDIT)) {
            return ApiResponse::error('Insufficient permissions to modify spell mount links', 'FORBIDDEN', 403);
        }

        return $this->replaceLinks($request, $id, Mount::MOUNTABLE_SPELL, 'spell_ids');
    }

    /**
     * Atomically replace node + spell links for a mount (single transaction).
     */
    public function setNodesAndSpells(Request $request, int $id): Response
    {
        $user = $request->get('user');
        if (!PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SPELLS_EDIT)) {
            return ApiResponse::error('Insufficient permissions to modify spell mount links', 'FORBIDDEN', 403);
        }
        $m = Mount::getMountById($id);
        if (!$m) {
            return ApiResponse::error('Mount not found', 'MOUNT_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true);
        if (
            !is_array($data) || !isset($data['node_ids'], $data['spell_ids'])
            || !is_array($data['node_ids']) || !is_array($data['spell_ids'])
        ) {
            return ApiResponse::error(
                'Missing node_ids and spell_ids arrays',
                'INVALID_JSON',
                400
            );
        }
        $nodeParsed = $this->parseBodyPositiveIntIds($data['node_ids'], 'node_ids');
        if ($nodeParsed instanceof Response) {
            return $nodeParsed;
        }
        $spellParsed = $this->parseBodyPositiveIntIds($data['spell_ids'], 'spell_ids');
        if ($spellParsed instanceof Response) {
            return $spellParsed;
        }
        foreach ($nodeParsed as $eid) {
            if (!Node::getNodeById($eid)) {
                return ApiResponse::error('Invalid node_id: ' . $eid, 'INVALID_NODE_ID', 400);
            }
        }
        foreach ($spellParsed as $eid) {
            if (!Spell::getSpellById($eid)) {
                return ApiResponse::error('Invalid spell_id: ' . $eid, 'INVALID_SPELL_ID', 400);
            }
        }
        if (!Mount::replaceNodeAndSpellLinksForMount($id, $nodeParsed, $spellParsed)) {
            return ApiResponse::error('Failed to update mount links', 'UPDATE_FAILED', 500);
        }
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'],
            'name' => 'update_mount_nodes_spells',
            'context' => 'Updated node and spell links for mount ' . $id,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['mount' => self::enrichMount(Mount::getMountById($id) ?? [])], 'Mount links updated', 200);
    }

    public function setServers(Request $request, int $id): Response
    {
        $user = $request->get('user');
        if (!PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_EDIT)) {
            return ApiResponse::error('Insufficient permissions to modify server mount links', 'FORBIDDEN', 403);
        }

        return $this->replaceLinks($request, $id, Mount::MOUNTABLE_SERVER, 'server_ids');
    }

    #[OA\Get(path: '/api/admin/servers/{id}/mounts/assignable', summary: 'Mounts that can be toggled for this server', tags: ['Admin - Mounts'])]
    public function assignableForServer(Request $request, int $serverId): Response
    {
        if (!Server::getServerById($serverId)) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }
        $spellOverride = null;
        $q = $request->query->get('spell_id');
        if ($q !== null && $q !== '') {
            if (!is_numeric($q)) {
                return ApiResponse::error('spell_id must be numeric', 'VALIDATION_ERROR', 400);
            }
            $spellOverride = (int) $q;
            if ($spellOverride <= 0 || !Spell::getSpellById($spellOverride)) {
                return ApiResponse::error('Invalid spell_id', 'INVALID_SPELL_ID', 400);
            }
        }
        $rows = Mount::getAssignableMountsForServer($serverId, $spellOverride);
        foreach ($rows as &$r) {
            $r = self::enrichMount($r);
        }
        unset($r);

        return ApiResponse::success(['mounts' => $rows], 'Assignable mounts fetched', 200);
    }

    /**
     * JSON/body boolean; invalid values yield null.
     */
    private static function requestBoolean(mixed $value): ?bool
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    }

    /**
     * @return array{error: ?string, source: string, target: string}
     */
    private static function validatedStoragePaths(string $source, string $target): array
    {
        $r = Mount::normalizeAndValidateBindMountPaths($source, $target);
        if ($r['error'] !== null) {
            return ['error' => $r['error'], 'source' => '', 'target' => ''];
        }

        return [
            'error' => null,
            'source' => $r['source'],
            'target' => $r['target'],
        ];
    }

    private static function enrichMount(array $mount): array
    {
        $id = (int) $mount['id'];
        $mount['node_ids'] = Mount::getMountableIds($id, Mount::MOUNTABLE_NODE);
        $mount['spell_ids'] = Mount::getMountableIds($id, Mount::MOUNTABLE_SPELL);
        $mount['server_ids'] = Mount::getMountableIds($id, Mount::MOUNTABLE_SERVER);
        $mount['read_only'] = (bool) (int) ($mount['read_only'] ?? 0);
        $mount['user_mountable'] = (bool) (int) ($mount['user_mountable'] ?? 0);

        return $mount;
    }

    /**
     * @param 'node'|'spell'|'server' $type
     */
    private function replaceLinks(Request $request, int $mountId, string $type, string $bodyKey): Response
    {
        $m = Mount::getMountById($mountId);
        if (!$m) {
            return ApiResponse::error('Mount not found', 'MOUNT_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data[$bodyKey]) || !is_array($data[$bodyKey])) {
            return ApiResponse::error('Missing array field: ' . $bodyKey, 'INVALID_JSON', 400);
        }
        $parsed = $this->parseBodyPositiveIntIds($data[$bodyKey], $bodyKey);
        if ($parsed instanceof Response) {
            return $parsed;
        }
        $ids = $parsed;
        foreach ($ids as $eid) {
            if ($type === Mount::MOUNTABLE_NODE && !Node::getNodeById($eid)) {
                return ApiResponse::error('Invalid node_id: ' . $eid, 'INVALID_NODE_ID', 400);
            }
            if ($type === Mount::MOUNTABLE_SPELL && !Spell::getSpellById($eid)) {
                return ApiResponse::error('Invalid spell_id: ' . $eid, 'INVALID_SPELL_ID', 400);
            }
            if ($type === Mount::MOUNTABLE_SERVER && !Server::getServerById($eid)) {
                return ApiResponse::error('Invalid server_id: ' . $eid, 'INVALID_SERVER_ID', 400);
            }
        }
        if ($type === Mount::MOUNTABLE_SERVER && $ids !== []) {
            foreach ($ids as $sid) {
                $err = Mount::validateMountsForServer($sid, [$mountId]);
                if ($err !== null) {
                    return ApiResponse::error($err, 'MOUNT_NOT_ASSIGNABLE', 422);
                }
            }
        }
        if (!Mount::replaceLinksFromMount($mountId, $type, $ids)) {
            return ApiResponse::error('Failed to update mount links', 'UPDATE_FAILED', 500);
        }
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'],
            'name' => 'update_mount_' . $type . 's',
            'context' => 'Updated ' . $type . ' links for mount ' . $mountId,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['mount' => self::enrichMount(Mount::getMountById($mountId) ?? [])], 'Mount links updated', 200);
    }

    /**
     * @param array<mixed> $items Per API item in the request body array
     *
     * @return list<int>|Response
     */
    private function parseBodyPositiveIntIds(array $items, string $bodyKey): array | Response
    {
        $ids = [];
        foreach ($items as $item) {
            if (is_int($item)) {
                if ($item < 1) {
                    return ApiResponse::error('Invalid id in ' . $bodyKey, 'INVALID_JSON', 400);
                }
                $ids[] = $item;

                continue;
            }
            if (is_float($item)) {
                return ApiResponse::error('Invalid id in ' . $bodyKey, 'INVALID_JSON', 400);
            }
            if (is_string($item)) {
                if ($item === '' || !ctype_digit($item)) {
                    return ApiResponse::error('Invalid id in ' . $bodyKey, 'INVALID_JSON', 400);
                }
                $ids[] = (int) $item;

                continue;
            }

            return ApiResponse::error('Invalid id in ' . $bodyKey, 'INVALID_JSON', 400);
        }

        return $ids;
    }
}
