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
};
