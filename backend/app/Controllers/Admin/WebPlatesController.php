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

use App\Chat\WebPlate;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Helpers\WebSpaceScheduleTasks;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Admin CRUD for WebPlates (web hosting templates — not Spells).
 */
class WebPlatesController
{
    #[OA\Get(path: '/api/admin/webplates', summary: 'List WebPlates', tags: ['Admin - WebPlates'])]
    public function index(Request $request): Response
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = max(1, min(200, (int) $request->query->get('limit', 50)));
        $runtime = $request->query->get('runtime');
        $runtimeFilter = is_string($runtime) && $runtime !== '' ? $runtime : null;
        $search = $request->query->get('search');
        $searchFilter = is_string($search) && trim($search) !== '' ? trim($search) : null;

        $total = WebPlate::countAll($runtimeFilter, $searchFilter);
        $totalPages = max(1, (int) ceil($total / $limit));

        return ApiResponse::success([
            'webplates' => WebPlate::listAll($page, $limit, $runtimeFilter, $searchFilter),
            'runtimes' => WebPlate::RUNTIMES,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
            ],
        ], 'OK', 200);
    }

    #[OA\Get(path: '/api/admin/webplates/{id}', summary: 'Get WebPlate', tags: ['Admin - WebPlates'])]
    public function show(Request $request, int $id): Response
    {
        $plate = WebPlate::getById($id);
        if (!$plate) {
            return ApiResponse::error('WebPlate not found', 'WEBPLATE_NOT_FOUND', 404);
        }

        $plate['default_schedules'] = WebPlate::getDefaultSchedules($plate);

        return ApiResponse::success($plate, 'OK', 200);
    }

    #[OA\Put(path: '/api/admin/webplates', summary: 'Create WebPlate', tags: ['Admin - WebPlates'])]
    public function create(Request $request): Response
    {
        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $name = trim((string) ($content['name'] ?? ''));
        if ($name === '') {
            return ApiResponse::error('name is required', 'MISSING_FIELDS', 400);
        }

        $dockerImage = trim((string) ($content['docker_image'] ?? ''));
        if (array_key_exists('runtime', $content) && trim((string) $content['runtime']) !== '') {
            $runtime = strtolower(trim((string) $content['runtime']));
            if (!WebPlate::isValidRuntime($runtime)) {
                return ApiResponse::error(
                    'runtime must be one of: ' . implode(', ', WebPlate::RUNTIMES),
                    'INVALID_RUNTIME',
                    400,
                );
            }
        } else {
            $runtime = WebPlate::inferRuntimeFromDockerImage($dockerImage);
        }

        $defaults = WebSpaceScheduleTasks::validateAndNormalizeSchedules($content['default_schedules'] ?? []);
        if (is_string($defaults)) {
            return ApiResponse::error($defaults, 'INVALID_DEFAULT_SCHEDULES', 400);
        }

        $id = WebPlate::create([
            'uuid' => $content['uuid'] ?? null,
            'author' => (string) ($content['author'] ?? 'system'),
            'name' => $name,
            'description' => (string) ($content['description'] ?? ''),
            'runtime' => $runtime,
            'docker_image' => $dockerImage,
            'document_root' => (string) ($content['document_root'] ?? ''),
            'startup' => (string) ($content['startup'] ?? ''),
            'container_port' => isset($content['container_port']) ? (int) $content['container_port'] : 0,
            'script_container' => (string) ($content['script_container'] ?? 'alpine:3.20'),
            'script_entry' => (string) ($content['script_entry'] ?? 'ash'),
            'script_install' => (string) ($content['script_install'] ?? ''),
            'default_schedules' => $defaults,
        ]);

        if ($id === false) {
            return ApiResponse::error('Failed to create WebPlate', 'CREATE_FAILED', 500);
        }

        $plate = WebPlate::getById($id);
        if ($plate) {
            $plate['default_schedules'] = WebPlate::getDefaultSchedules($plate);
        }

        return ApiResponse::success(['webplate' => $plate], 'WebPlate created', 201);
    }

    #[OA\Patch(path: '/api/admin/webplates/{id}', summary: 'Update WebPlate', tags: ['Admin - WebPlates'])]
    public function update(Request $request, int $id): Response
    {
        if (!WebPlate::getById($id)) {
            return ApiResponse::error('WebPlate not found', 'WEBPLATE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        if (isset($content['runtime']) && !WebPlate::isValidRuntime((string) $content['runtime'])) {
            return ApiResponse::error(
                'runtime must be one of: ' . implode(', ', WebPlate::RUNTIMES),
                'INVALID_RUNTIME',
                400,
            );
        }

        if (array_key_exists('default_schedules', $content)) {
            $defaults = WebSpaceScheduleTasks::validateAndNormalizeSchedules($content['default_schedules']);
            if (is_string($defaults)) {
                return ApiResponse::error($defaults, 'INVALID_DEFAULT_SCHEDULES', 400);
            }
            $content['default_schedules'] = $defaults;
        }

        $allowed = [
            'author',
            'name',
            'description',
            'runtime',
            'docker_image',
            'document_root',
            'startup',
            'container_port',
            'script_container',
            'script_entry',
            'script_install',
            'default_schedules',
        ];
        $patch = array_intersect_key($content, array_flip($allowed));
        if ($patch === []) {
            return ApiResponse::error('No valid fields to update', 'EMPTY_PATCH', 400);
        }

        if (!WebPlate::update($id, $patch)) {
            return ApiResponse::error('Failed to update WebPlate', 'UPDATE_FAILED', 500);
        }

        $plate = WebPlate::getById($id);
        if ($plate) {
            $plate['default_schedules'] = WebPlate::getDefaultSchedules($plate);
        }

        return ApiResponse::success(['webplate' => $plate], 'WebPlate updated', 200);
    }

    #[OA\Delete(path: '/api/admin/webplates/{id}', summary: 'Delete WebPlate', tags: ['Admin - WebPlates'])]
    public function delete(Request $request, int $id): Response
    {
        if (!WebPlate::getById($id)) {
            return ApiResponse::error('WebPlate not found', 'WEBPLATE_NOT_FOUND', 404);
        }

        if (!WebPlate::delete($id)) {
            return ApiResponse::error(
                'Failed to delete WebPlate (it may still be used by WebSpaces)',
                'DELETE_FAILED',
                409,
            );
        }

        return ApiResponse::success(['id' => $id], 'WebPlate deleted', 200);
    }
}
