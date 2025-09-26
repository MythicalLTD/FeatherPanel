<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\System;

use App\Chat\RedirectLink;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'RedirectLink',
    type: 'object',
    properties: [
        new OA\Property(property: 'slug', type: 'string', description: 'Redirect link slug'),
        new OA\Property(property: 'url', type: 'string', format: 'uri', description: 'Target URL'),
        new OA\Property(property: 'name', type: 'string', description: 'Redirect link name'),
    ]
)]
#[OA\Schema(
    schema: 'RedirectLinksResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'redirect_links', type: 'array', items: new OA\Items(ref: '#/components/schemas/RedirectLink')),
        new OA\Property(property: 'count', type: 'integer', description: 'Total number of redirect links'),
    ]
)]
class RedirectLinks
{
    #[OA\Get(
        path: '/api/redirect-links',
        summary: 'Get all redirect links',
        description: 'Retrieve all public redirect links. This is a public endpoint that does not require authentication.',
        tags: ['General'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Redirect links retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/RedirectLinksResponse')
            ),
            new OA\Response(response: 500, description: 'Internal server error - Failed to fetch redirect links'),
        ]
    )]
    public function getAll(Request $request): Response
    {
        try {
            $redirectLinks = RedirectLink::getAll(1, 1000); // Get all redirect links

            // Return only public data (no sensitive information)
            $publicRedirects = array_map(function ($redirect) {
                return [
                    'slug' => $redirect['slug'],
                    'url' => $redirect['url'],
                    'name' => $redirect['name'],
                ];
            }, $redirectLinks);

            return ApiResponse::success([
                'redirect_links' => $publicRedirects,
                'count' => count($publicRedirects),
            ], 'Redirect links fetched successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch redirect links', 'FETCH_ERROR', 500);
        }
    }

    #[OA\Get(
        path: '/api/redirect-links/{slug}',
        summary: 'Get redirect link by slug',
        description: 'Retrieve a specific redirect link by its slug. This is a public endpoint that does not require authentication.',
        tags: ['General'],
        parameters: [
            new OA\Parameter(
                name: 'slug',
                in: 'path',
                description: 'Redirect link slug',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Redirect link retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'redirect_link', ref: '#/components/schemas/RedirectLink'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing slug parameter'),
            new OA\Response(response: 404, description: 'Redirect link not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to fetch redirect link'),
        ]
    )]
    public function getBySlug(Request $request, string $slug): Response
    {
        try {
            $redirectLink = RedirectLink::getBySlug($slug);

            if (!$redirectLink) {
                return ApiResponse::error('Redirect link not found', 'REDIRECT_LINK_NOT_FOUND', 404);
            }
            // Return only public data
            $publicRedirect = [
                'slug' => $redirectLink['slug'],
                'url' => $redirectLink['url'],
                'name' => $redirectLink['name'],
            ];

            return ApiResponse::success(['redirect_link' => $publicRedirect], 'Redirect link fetched successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch redirect link', 'FETCH_ERROR', 500);
        }
    }
}
