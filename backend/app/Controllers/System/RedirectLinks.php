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
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectLinks
{
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
