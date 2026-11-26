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
use App\Permissions;
use App\Helpers\ApiResponse;
use App\Controllers\Admin\WebhooksController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    $app = App::getInstance(true);
    $withId = static function (callable $handler): callable {
        return static function (Request $request, array $args) use ($handler) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id) || (int) $id <= 0) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return $handler($request, (int) $id);
        };
    };

    // Static paths first so "settings" and "deliveries" are never read as an {id}.
    $app->registerAdminRoute($routes, 'admin-webhooks-settings', '/api/admin/webhooks/settings', fn (Request $r) => (new WebhooksController())->settings($r), Permissions::ADMIN_WEBHOOKS_VIEW, ['GET']);
    $app->registerAdminRoute($routes, 'admin-webhooks-settings-update', '/api/admin/webhooks/settings', fn (Request $r) => (new WebhooksController())->updateSettings($r), Permissions::ADMIN_WEBHOOKS_MANAGE, ['PUT']);
    $app->registerAdminRoute($routes, 'admin-webhooks-delivery', '/api/admin/webhooks/deliveries/{id}', $withId(fn (Request $r, int $id) => (new WebhooksController())->delivery($r, $id)), Permissions::ADMIN_WEBHOOKS_VIEW, ['GET']);
    $app->registerAdminRoute($routes, 'admin-webhooks-delivery-redeliver', '/api/admin/webhooks/deliveries/{id}/redeliver', $withId(fn (Request $r, int $id) => (new WebhooksController())->redeliver($r, $id)), Permissions::ADMIN_WEBHOOKS_MANAGE, ['POST']);

    $app->registerAdminRoute($routes, 'admin-webhooks', '/api/admin/webhooks', fn (Request $r) => (new WebhooksController())->index($r), Permissions::ADMIN_WEBHOOKS_VIEW, ['GET']);
    $app->registerAdminRoute($routes, 'admin-webhooks-create', '/api/admin/webhooks', fn (Request $r) => (new WebhooksController())->create($r), Permissions::ADMIN_WEBHOOKS_MANAGE, ['POST']);
    $app->registerAdminRoute($routes, 'admin-webhooks-show', '/api/admin/webhooks/{id}', $withId(fn (Request $r, int $id) => (new WebhooksController())->show($r, $id)), Permissions::ADMIN_WEBHOOKS_VIEW, ['GET']);
    $app->registerAdminRoute($routes, 'admin-webhooks-update', '/api/admin/webhooks/{id}', $withId(fn (Request $r, int $id) => (new WebhooksController())->update($r, $id)), Permissions::ADMIN_WEBHOOKS_MANAGE, ['PATCH']);
    $app->registerAdminRoute($routes, 'admin-webhooks-delete', '/api/admin/webhooks/{id}', $withId(fn (Request $r, int $id) => (new WebhooksController())->delete($r, $id)), Permissions::ADMIN_WEBHOOKS_MANAGE, ['DELETE']);
    $app->registerAdminRoute($routes, 'admin-webhooks-secret', '/api/admin/webhooks/{id}/secret', $withId(fn (Request $r, int $id) => (new WebhooksController())->secret($r, $id)), Permissions::ADMIN_WEBHOOKS_MANAGE, ['GET']);
    $app->registerAdminRoute($routes, 'admin-webhooks-rotate-secret', '/api/admin/webhooks/{id}/rotate-secret', $withId(fn (Request $r, int $id) => (new WebhooksController())->rotateSecret($r, $id)), Permissions::ADMIN_WEBHOOKS_MANAGE, ['POST']);
    $app->registerAdminRoute($routes, 'admin-webhooks-test', '/api/admin/webhooks/{id}/test', $withId(fn (Request $r, int $id) => (new WebhooksController())->test($r, $id)), Permissions::ADMIN_WEBHOOKS_MANAGE, ['POST']);
    $app->registerAdminRoute($routes, 'admin-webhooks-deliveries', '/api/admin/webhooks/{id}/deliveries', $withId(fn (Request $r, int $id) => (new WebhooksController())->deliveries($r, $id)), Permissions::ADMIN_WEBHOOKS_VIEW, ['GET']);
};
