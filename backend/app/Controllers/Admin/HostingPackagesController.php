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

use App\Chat\HostingPackage;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class HostingPackagesController
{
    #[OA\Get(path: '/api/admin/hosting-packages', summary: 'List hosting packages', tags: ['Admin - Hosting packages'])]
    public function index(Request $request): Response
    {
        return ApiResponse::success([
            'packages' => HostingPackage::listAll(),
        ], 'OK', 200);
    }

    #[OA\Get(path: '/api/admin/hosting-packages/{id}', summary: 'Get hosting package', tags: ['Admin - Hosting packages'])]
    public function show(Request $request, int $id): Response
    {
        $pkg = HostingPackage::getById($id);
        if (!$pkg) {
            return ApiResponse::error('Hosting package not found', 'PACKAGE_NOT_FOUND', 404);
        }

        return ApiResponse::success($pkg, 'OK', 200);
    }

    #[OA\Put(path: '/api/admin/hosting-packages', summary: 'Create hosting package', tags: ['Admin - Hosting packages'])]
    public function create(Request $request): Response
    {
        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $id = HostingPackage::create($content);
        if ($id === false) {
            return ApiResponse::error('Failed to create hosting package', 'CREATE_FAILED', 500);
        }

        $pkg = HostingPackage::getById($id);

        return ApiResponse::success($pkg, 'Hosting package created', 201);
    }

    #[OA\Patch(path: '/api/admin/hosting-packages/{id}', summary: 'Update hosting package', tags: ['Admin - Hosting packages'])]
    public function update(Request $request, int $id): Response
    {
        $pkg = HostingPackage::getById($id);
        if (!$pkg) {
            return ApiResponse::error('Hosting package not found', 'PACKAGE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        if (!HostingPackage::update($id, $content)) {
            return ApiResponse::error('Failed to update hosting package', 'UPDATE_FAILED', 500);
        }

        return ApiResponse::success(HostingPackage::getById($id), 'Hosting package updated', 200);
    }

    #[OA\Delete(path: '/api/admin/hosting-packages/{id}', summary: 'Delete hosting package', tags: ['Admin - Hosting packages'])]
    public function delete(Request $request, int $id): Response
    {
        $pkg = HostingPackage::getById($id);
        if (!$pkg) {
            return ApiResponse::error('Hosting package not found', 'PACKAGE_NOT_FOUND', 404);
        }

        if (!HostingPackage::delete($id)) {
            return ApiResponse::error('Failed to delete hosting package', 'DELETE_FAILED', 500);
        }

        return ApiResponse::success(null, 'Hosting package deleted', 200);
    }
}
