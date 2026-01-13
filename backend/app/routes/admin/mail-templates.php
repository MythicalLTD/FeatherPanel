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
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\MailTemplatesController;

return function (RouteCollection $routes): void {
    // List mail templates
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-mail-templates',
        '/api/admin/mail-templates',
        function (Request $request) {
            return (new MailTemplatesController())->index($request);
        },
        Permissions::ADMIN_TEMPLATE_EMAIL_VIEW,
        ['GET']
    );

    // Get specific mail template
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-mail-templates-show',
        '/api/admin/mail-templates/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Invalid template ID', 'INVALID_TEMPLATE_ID', 400);
            }

            return (new MailTemplatesController())->show($request, (int) $id);
        },
        Permissions::ADMIN_TEMPLATE_EMAIL_VIEW,
        ['GET']
    );

    // Create new mail template
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-mail-templates-create',
        '/api/admin/mail-templates',
        function (Request $request) {
            return (new MailTemplatesController())->create($request);
        },
        Permissions::ADMIN_TEMPLATE_EMAIL_CREATE,
        ['POST']
    );

    // Update mail template
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-mail-templates-update',
        '/api/admin/mail-templates/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Invalid template ID', 'INVALID_TEMPLATE_ID', 400);
            }

            return (new MailTemplatesController())->update($request, (int) $id);
        },
        Permissions::ADMIN_TEMPLATE_EMAIL_EDIT,
        ['PATCH']
    );

    // Soft delete mail template
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-mail-templates-delete',
        '/api/admin/mail-templates/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Invalid template ID', 'INVALID_TEMPLATE_ID', 400);
            }

            return (new MailTemplatesController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_TEMPLATE_EMAIL_DELETE,
        ['DELETE']
    );

    // Restore soft deleted mail template
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-mail-templates-restore',
        '/api/admin/mail-templates/{id}/restore',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Invalid template ID', 'INVALID_TEMPLATE_ID', 400);
            }

            return (new MailTemplatesController())->restore($request, (int) $id);
        },
        Permissions::ADMIN_TEMPLATE_EMAIL_EDIT,
        ['POST']
    );

    // Hard delete mail template (permanent)
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-mail-templates-hard-delete',
        '/api/admin/mail-templates/{id}/hard-delete',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Invalid template ID', 'INVALID_TEMPLATE_ID', 400);
            }

            return (new MailTemplatesController())->hardDelete($request, (int) $id);
        },
        Permissions::ADMIN_TEMPLATE_EMAIL_DELETE,
        ['DELETE']
    );

    // Send mass email to all users
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-mail-templates-mass-email',
        '/api/admin/mail-templates/mass-email',
        function (Request $request) {
            return (new MailTemplatesController())->sendMassEmail($request);
        },
        Permissions::ADMIN_TEMPLATE_EMAIL_CREATE,
        ['POST']
    );
};
