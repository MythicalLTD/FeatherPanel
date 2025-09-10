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

namespace App\Controllers;

use App\Chat\RedirectLink;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\RedirectResponse;

class RedirectController
{
    public function redirect(Request $request, string $slug): Response
    {
        $redirectLink = RedirectLink::getBySlug($slug);

        if (!$redirectLink) {
            return ApiResponse::error('Redirect link not found', 'REDIRECT_LINK_NOT_FOUND', 404);
        }

        // Return a redirect response
        return new RedirectResponse($redirectLink['url'], 302);
    }
}
