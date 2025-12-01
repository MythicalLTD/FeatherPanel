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
