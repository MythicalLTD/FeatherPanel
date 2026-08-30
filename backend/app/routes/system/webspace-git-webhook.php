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

use App\App;
use RateLimit\Rate;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\System\WebSpaceGitWebhookController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerApiRoute(
        $routes,
        'public-webspace-git-deploy-webhook',
        '/api/webhooks/webspaces/{uuid}/git-deploy',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing uuid', 'INVALID_UUID', 400);
            }

            return (new WebSpaceGitWebhookController())->deploy($request, $uuid);
        },
        ['POST'],
        Rate::perMinute(30),
        'public-webhooks'
    );
};
