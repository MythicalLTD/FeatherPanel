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

use App\App;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Tag(name: 'Admin - Setup Wizard', description: 'First-install setup wizard state')]
class SetupWizardController
{
    #[OA\Get(
        path: '/api/admin/setup/status',
        summary: 'Get setup wizard status',
        tags: ['Admin - Setup Wizard'],
        responses: [new OA\Response(response: 200, description: 'Setup status')]
    )]
    public function status(Request $request): Response
    {
        return ApiResponse::success([
            'completed' => self::isCompleted(),
            'app_url' => App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_URL, ''),
        ], 'Setup status retrieved', 200);
    }

    #[OA\Post(
        path: '/api/admin/setup/complete',
        summary: 'Mark the setup wizard as completed',
        tags: ['Admin - Setup Wizard'],
        responses: [new OA\Response(response: 200, description: 'Setup marked completed')]
    )]
    public function complete(Request $request): Response
    {
        return $this->setCompleted($request, true);
    }

    #[OA\Post(
        path: '/api/admin/setup/reset',
        summary: 'Reopen the setup wizard',
        tags: ['Admin - Setup Wizard'],
        responses: [new OA\Response(response: 200, description: 'Setup reopened')]
    )]
    public function reset(Request $request): Response
    {
        return $this->setCompleted($request, false);
    }

    public static function isCompleted(): bool
    {
        return App::getInstance(true)->getConfig()->getSetting(ConfigInterface::SETUP_COMPLETED, 'false') === 'true';
    }

    private function setCompleted(Request $request, bool $completed): Response
    {
        $app = App::getInstance(true);
        if (!$app->getConfig()->setSetting(ConfigInterface::SETUP_COMPLETED, $completed ? 'true' : 'false')) {
            return ApiResponse::error('Failed to update setup state', 'INTERNAL_SERVER_ERROR', 500);
        }

        Activity::createActivity([
            'user_uuid' => $request->attributes->get('user')['uuid'] ?? null,
            'name' => $completed ? 'setup_wizard_completed' : 'setup_wizard_reopened',
            'context' => $completed ? 'Completed the setup wizard' : 'Reopened the setup wizard',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['completed' => $completed], 'Setup state updated', 200);
    }
}
