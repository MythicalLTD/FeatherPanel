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
