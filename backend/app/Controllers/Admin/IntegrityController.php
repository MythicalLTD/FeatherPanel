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

use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Services\PanelIntegrityService;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class IntegrityController
{
    #[OA\Get(
        path: '/api/admin/integrity/check',
        summary: 'Scan panel file integrity (SHA-256)',
        description: 'Hashes core backend PHP tree, public/index.php, and composer lockfiles. Optionally compares against storage/config/panel_integrity_baseline.json.',
        tags: ['Admin - Integrity'],
        responses: [
            new OA\Response(response: 200, description: 'Scan completed'),
            new OA\Response(response: 500, description: 'Scan failed'),
        ]
    )]
    public function check(Request $request): Response
    {
        @set_time_limit(300);

        try {
            $includeFiles = filter_var($request->query->get('include_files', '1'), FILTER_VALIDATE_BOOLEAN);
            $service = PanelIntegrityService::fromEnvironment();
            $data = $service->run($includeFiles);

            return ApiResponse::success($data, 'Integrity scan completed', 200);
        } catch (\Throwable $e) {
            return ApiResponse::error('Integrity scan failed: ' . $e->getMessage(), 'INTEGRITY_SCAN_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/integrity/baseline',
        summary: 'Save current scan as integrity baseline',
        description: 'Writes storage/config/panel_integrity_baseline.json from the current file hashes.',
        tags: ['Admin - Integrity'],
        responses: [
            new OA\Response(response: 200, description: 'Baseline saved'),
            new OA\Response(response: 500, description: 'Failed to save'),
        ]
    )]
    public function saveBaseline(Request $request): Response
    {
        @set_time_limit(300);

        try {
            $service = PanelIntegrityService::fromEnvironment();
            $data = $service->run(true);
            $service->writeBaselineFromScan($data['files']);

            return ApiResponse::success(
                [
                    'baseline_relative_path' => PanelIntegrityService::BASELINE_RELATIVE_PATH,
                    'files_recorded' => count($data['files']),
                    'panel_version' => defined('APP_VERSION') ? APP_VERSION : null,
                ],
                'Integrity baseline saved',
                200
            );
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to save baseline: ' . $e->getMessage(), 'INTEGRITY_BASELINE_ERROR', 500);
        }
    }
}
