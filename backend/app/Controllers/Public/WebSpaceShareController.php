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

namespace App\Controllers\Public;

use App\Helpers\WebSpaceFileShare;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WebSpaceShareController
{
    public function download(Request $request, string $publicId): Response
    {
        $share = WebSpaceFileShare::resolve($publicId);
        if ($share === null) {
            return new Response('Share not found or expired', 404);
        }

        return new Response($share['contents'], 200, [
            'Content-Type' => 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="' . str_replace('"', '', $share['filename']) . '"',
        ]);
    }

    public function delete(Request $request, string $publicId): Response
    {
        $deleteKey = trim((string) $request->query->get('delete_key', ''));
        if ($deleteKey === '' || !WebSpaceFileShare::delete($publicId, $deleteKey)) {
            return new Response('Forbidden', 403);
        }

        return new Response('', 204);
    }
}
