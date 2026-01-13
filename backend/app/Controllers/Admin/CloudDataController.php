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
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\FeatherCloud\FeatherCloudClient;
use App\Services\FeatherCloud\FeatherCloudException;

class CloudDataController
{
    #[OA\Get(
        path: '/api/admin/cloud/data/summary',
        summary: 'Get FeatherCloud summary',
        description: 'Retrieve comprehensive summary including cloud, team, credits, and products information. Requires ADMIN_ROOT permissions.',
        tags: ['Admin - FeatherCloud'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Summary retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'cloud', type: 'object'),
                        new OA\Property(property: 'team', type: 'object'),
                        new OA\Property(property: 'statistics', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Requires ADMIN_ROOT permissions'),
            new OA\Response(response: 503, description: 'FeatherCloud credentials not configured'),
        ]
    )]
    public function getSummary(Request $request): Response
    {
        try {
            $client = new FeatherCloudClient();
            if (!$client->isConfigured()) {
                return ApiResponse::error('FeatherCloud credentials are not configured', 'CLOUD_CREDENTIALS_NOT_CONFIGURED', 503);
            }
            $data = $client->getSummary();

            return ApiResponse::success($data, 'Cloud summary retrieved successfully', 200);
        } catch (FeatherCloudException $e) {
            return ApiResponse::error($e->getMessage(), $e->getErrorCode(), $e->getHttpStatusCode());
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to retrieve cloud summary: ' . $e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/cloud/data/credits',
        summary: 'Get team credits',
        description: 'Retrieve total credits across all team members with individual breakdowns. Requires ADMIN_ROOT permissions.',
        tags: ['Admin - FeatherCloud'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Credits retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'total_credits', type: 'number'),
                        new OA\Property(property: 'member_credits', type: 'array'),
                        new OA\Property(property: 'member_count', type: 'integer'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Requires ADMIN_ROOT permissions'),
            new OA\Response(response: 503, description: 'FeatherCloud credentials not configured'),
        ]
    )]
    public function getCredits(Request $request): Response
    {
        try {
            $client = new FeatherCloudClient();
            if (!$client->isConfigured()) {
                return ApiResponse::error('FeatherCloud credentials are not configured', 'CLOUD_CREDENTIALS_NOT_CONFIGURED', 503);
            }
            $data = $client->getTotalCredits();

            return ApiResponse::success($data, 'Credits retrieved successfully', 200);
        } catch (FeatherCloudException $e) {
            return ApiResponse::error($e->getMessage(), $e->getErrorCode(), $e->getHttpStatusCode());
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to retrieve credits: ' . $e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/cloud/data/team',
        summary: 'Get team information',
        description: 'Retrieve information about the team associated with the cloud. Requires ADMIN_ROOT permissions.',
        tags: ['Admin - FeatherCloud'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Team information retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'team', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Requires ADMIN_ROOT permissions'),
            new OA\Response(response: 503, description: 'FeatherCloud credentials not configured'),
        ]
    )]
    public function getTeam(Request $request): Response
    {
        try {
            $client = new FeatherCloudClient();
            if (!$client->isConfigured()) {
                return ApiResponse::error('FeatherCloud credentials are not configured', 'CLOUD_CREDENTIALS_NOT_CONFIGURED', 503);
            }
            $data = $client->getTeam();

            return ApiResponse::success($data, 'Team information retrieved successfully', 200);
        } catch (FeatherCloudException $e) {
            return ApiResponse::error($e->getMessage(), $e->getErrorCode(), $e->getHttpStatusCode());
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to retrieve team information: ' . $e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/cloud/data/products',
        summary: 'Get purchased products',
        description: 'Retrieve all purchased products for all team members with pagination. Requires ADMIN_ROOT permissions.',
        tags: ['Admin - FeatherCloud'],
        parameters: [
            new OA\Parameter(
                name: 'page',
                in: 'query',
                description: 'Page number',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)
            ),
            new OA\Parameter(
                name: 'limit',
                in: 'query',
                description: 'Results per page',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 50)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Products retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'purchases', type: 'array'),
                        new OA\Property(property: 'pagination', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Requires ADMIN_ROOT permissions'),
            new OA\Response(response: 503, description: 'FeatherCloud credentials not configured'),
        ]
    )]
    public function getProducts(Request $request): Response
    {
        try {
            $page = (int) $request->query->get('page', 1);
            $limit = (int) $request->query->get('limit', 50);

            $client = new FeatherCloudClient();
            if (!$client->isConfigured()) {
                return ApiResponse::error('FeatherCloud credentials are not configured', 'CLOUD_CREDENTIALS_NOT_CONFIGURED', 503);
            }
            $data = $client->getPurchasedProducts($page, $limit);

            return ApiResponse::success($data, 'Products retrieved successfully', 200);
        } catch (FeatherCloudException $e) {
            return ApiResponse::error($e->getMessage(), $e->getErrorCode(), $e->getHttpStatusCode());
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to retrieve products: ' . $e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/cloud/data/download/{packageName}/{version}',
        summary: 'Download premium package',
        description: 'Download a premium package file (.fpa) for a specific version. Requires ADMIN_ROOT permissions.',
        tags: ['Admin - FeatherCloud'],
        parameters: [
            new OA\Parameter(
                name: 'packageName',
                in: 'path',
                description: 'Package name/identifier',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'version',
                in: 'path',
                description: 'Package version',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Package downloaded successfully',
                content: new OA\MediaType(
                    mediaType: 'application/octet-stream',
                    schema: new OA\Schema(type: 'string', format: 'binary')
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Requires ADMIN_ROOT permissions or no access'),
            new OA\Response(response: 404, description: 'Package or version not found'),
            new OA\Response(response: 503, description: 'FeatherCloud credentials not configured'),
        ]
    )]
    public function downloadPackage(Request $request, string $packageName, string $version): Response
    {
        try {
            $client = new FeatherCloudClient();
            if (!$client->isConfigured()) {
                return ApiResponse::error('FeatherCloud credentials are not configured. Please configure your cloud account credentials in Cloud Management to download premium plugins.', 'CLOUD_CREDENTIALS_NOT_CONFIGURED', 503);
            }
            $fileContent = $client->downloadPremiumPackage($packageName, $version);

            $response = new Response($fileContent, 200);
            $response->headers->set('Content-Type', 'application/octet-stream');
            $response->headers->set('Content-Disposition', "attachment; filename=\"{$packageName}-{$version}.fpa\"");

            return $response;
        } catch (FeatherCloudException $e) {
            // Don't spam with credentials error if already checked
            if ($e->getErrorCode() === 'CREDENTIALS_NOT_CONFIGURED') {
                return ApiResponse::error('FeatherCloud credentials are not configured. Please configure your cloud account credentials in Cloud Management to download premium plugins.', 'CLOUD_CREDENTIALS_NOT_CONFIGURED', 503);
            }

            return ApiResponse::error($e->getMessage(), $e->getErrorCode(), $e->getHttpStatusCode());
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to download package: ' . $e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }
}
