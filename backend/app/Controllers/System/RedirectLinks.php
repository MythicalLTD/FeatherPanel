<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Controllers\System;

use App\Chat\RedirectLink;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'PublicRedirectLink',
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
        new OA\Property(property: 'redirect_links', type: 'array', items: new OA\Items(ref: '#/components/schemas/PublicRedirectLink')),
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
                        new OA\Property(property: 'redirect_link', ref: '#/components/schemas/PublicRedirectLink'),
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
