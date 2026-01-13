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
use App\Controllers\Admin\TicketsController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\TicketMessagesController;
use App\Controllers\Admin\TicketStatusesController;
use App\Controllers\Admin\TicketCategoriesController;
use App\Controllers\Admin\TicketPrioritiesController;
use App\Controllers\Admin\TicketAttachmentsController;

return function (RouteCollection $routes): void {
    // ==================== TICKETS (Base Routes) ====================

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-tickets',
        '/api/admin/tickets',
        function (Request $request) {
            return (new TicketsController())->index($request);
        },
        Permissions::ADMIN_TICKETS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-tickets-create',
        '/api/admin/tickets',
        function (Request $request) {
            return (new TicketsController())->create($request);
        },
        Permissions::ADMIN_TICKETS_CREATE,
        ['PUT']
    );

    // ==================== TICKET CATEGORIES (Specific routes before parameterized) ====================

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-categories-upload-icon',
        '/api/admin/tickets/categories/upload-icon',
        function (Request $request) {
            return (new TicketCategoriesController())->uploadIcon($request);
        },
        Permissions::ADMIN_TICKET_CATEGORIES_CREATE,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-categories',
        '/api/admin/tickets/categories',
        function (Request $request) {
            return (new TicketCategoriesController())->index($request);
        },
        Permissions::ADMIN_TICKET_CATEGORIES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-categories-show',
        '/api/admin/tickets/categories/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new TicketCategoriesController())->show($request, (int) $id);
        },
        Permissions::ADMIN_TICKET_CATEGORIES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-categories-create',
        '/api/admin/tickets/categories',
        function (Request $request) {
            return (new TicketCategoriesController())->create($request);
        },
        Permissions::ADMIN_TICKET_CATEGORIES_CREATE,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-categories-update',
        '/api/admin/tickets/categories/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new TicketCategoriesController())->update($request, (int) $id);
        },
        Permissions::ADMIN_TICKET_CATEGORIES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-categories-delete',
        '/api/admin/tickets/categories/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new TicketCategoriesController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_TICKET_CATEGORIES_DELETE,
        ['DELETE']
    );

    // ==================== TICKET PRIORITIES ====================

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-priorities',
        '/api/admin/tickets/priorities',
        function (Request $request) {
            return (new TicketPrioritiesController())->index($request);
        },
        Permissions::ADMIN_TICKET_PRIORITIES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-priorities-show',
        '/api/admin/tickets/priorities/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new TicketPrioritiesController())->show($request, (int) $id);
        },
        Permissions::ADMIN_TICKET_PRIORITIES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-priorities-create',
        '/api/admin/tickets/priorities',
        function (Request $request) {
            return (new TicketPrioritiesController())->create($request);
        },
        Permissions::ADMIN_TICKET_PRIORITIES_CREATE,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-priorities-update',
        '/api/admin/tickets/priorities/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new TicketPrioritiesController())->update($request, (int) $id);
        },
        Permissions::ADMIN_TICKET_PRIORITIES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-priorities-delete',
        '/api/admin/tickets/priorities/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new TicketPrioritiesController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_TICKET_PRIORITIES_DELETE,
        ['DELETE']
    );

    // ==================== TICKET STATUSES ====================

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-statuses',
        '/api/admin/tickets/statuses',
        function (Request $request) {
            return (new TicketStatusesController())->index($request);
        },
        Permissions::ADMIN_TICKET_STATUSES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-statuses-show',
        '/api/admin/tickets/statuses/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new TicketStatusesController())->show($request, (int) $id);
        },
        Permissions::ADMIN_TICKET_STATUSES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-statuses-create',
        '/api/admin/tickets/statuses',
        function (Request $request) {
            return (new TicketStatusesController())->create($request);
        },
        Permissions::ADMIN_TICKET_STATUSES_CREATE,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-statuses-update',
        '/api/admin/tickets/statuses/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new TicketStatusesController())->update($request, (int) $id);
        },
        Permissions::ADMIN_TICKET_STATUSES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-statuses-delete',
        '/api/admin/tickets/statuses/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new TicketStatusesController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_TICKET_STATUSES_DELETE,
        ['DELETE']
    );

    // ==================== TICKET MESSAGES ====================

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-messages',
        '/api/admin/tickets/{uuid}/messages',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new TicketMessagesController())->index($request, $uuid);
        },
        Permissions::ADMIN_TICKET_MESSAGES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-messages-show',
        '/api/admin/tickets/{uuid}/messages/{id}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            $id = $args['id'] ?? null;

            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new TicketMessagesController())->show($request, $uuid, (int) $id);
        },
        Permissions::ADMIN_TICKET_MESSAGES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-messages-create',
        '/api/admin/tickets/{uuid}/messages',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new TicketMessagesController())->create($request, $uuid);
        },
        Permissions::ADMIN_TICKET_MESSAGES_MANAGE,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-messages-update',
        '/api/admin/tickets/{uuid}/messages/{id}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            $id = $args['id'] ?? null;

            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new TicketMessagesController())->update($request, $uuid, (int) $id);
        },
        Permissions::ADMIN_TICKET_MESSAGES_MANAGE,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-messages-delete',
        '/api/admin/tickets/{uuid}/messages/{id}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            $id = $args['id'] ?? null;

            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new TicketMessagesController())->delete($request, $uuid, (int) $id);
        },
        Permissions::ADMIN_TICKET_MESSAGES_MANAGE,
        ['DELETE']
    );

    // ==================== TICKET ATTACHMENTS ====================

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-attachments-upload',
        '/api/admin/tickets/{uuid}/attachments',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new TicketAttachmentsController())->upload($request, $uuid);
        },
        Permissions::ADMIN_TICKET_ATTACHMENTS_MANAGE,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-attachments-index',
        '/api/admin/tickets/{uuid}/attachments',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new TicketAttachmentsController())->index($request, $uuid);
        },
        Permissions::ADMIN_TICKET_ATTACHMENTS_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ticket-attachments-delete',
        '/api/admin/tickets/{uuid}/attachments/{attachmentId}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            $attachmentId = $args['attachmentId'] ?? null;

            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }
            if (!$attachmentId || !is_numeric($attachmentId)) {
                return ApiResponse::error('Missing or invalid attachment ID', 'INVALID_ATTACHMENT_ID', 400);
            }

            return (new TicketAttachmentsController())->delete($request, $uuid, (int) $attachmentId);
        },
        Permissions::ADMIN_TICKET_ATTACHMENTS_MANAGE,
        ['DELETE']
    );

    // ==================== TICKETS (Parameterized routes - must come AFTER specific routes) ====================

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-tickets-reply',
        '/api/admin/tickets/{uuid}/reply',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new TicketsController())->reply($request, $uuid);
        },
        Permissions::ADMIN_TICKETS_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-tickets-show',
        '/api/admin/tickets/{uuid}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new TicketsController())->show($request, $uuid);
        },
        Permissions::ADMIN_TICKETS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-tickets-update',
        '/api/admin/tickets/{uuid}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new TicketsController())->update($request, $uuid);
        },
        Permissions::ADMIN_TICKETS_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-tickets-delete',
        '/api/admin/tickets/{uuid}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new TicketsController())->delete($request, $uuid);
        },
        Permissions::ADMIN_TICKETS_DELETE,
        ['DELETE']
    );
};
