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
use App\Controllers\Admin\KnowledgebaseController;

return function (RouteCollection $routes): void {
    // ==================== CATEGORIES ====================

    // LIST - GET /api/admin/knowledgebase/categories
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-knowledgebase-categories',
        '/api/admin/knowledgebase/categories',
        function (Request $request) {
            return (new KnowledgebaseController())->categoriesIndex($request);
        },
        Permissions::ADMIN_KNOWLEDGEBASE_CATEGORIES_VIEW,
    );

    // SHOW - GET /api/admin/knowledgebase/categories/{id}
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-knowledgebase-categories-show',
        '/api/admin/knowledgebase/categories/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->categoriesShow($request, (int) $id);
        },
        Permissions::ADMIN_KNOWLEDGEBASE_CATEGORIES_VIEW,
    );

    // CREATE - PUT /api/admin/knowledgebase/categories
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-knowledgebase-categories-create',
        '/api/admin/knowledgebase/categories',
        function (Request $request) {
            return (new KnowledgebaseController())->categoriesCreate($request);
        },
        Permissions::ADMIN_KNOWLEDGEBASE_CATEGORIES_CREATE,
        ['PUT']
    );

    // UPDATE - PATCH /api/admin/knowledgebase/categories/{id}
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-knowledgebase-categories-update',
        '/api/admin/knowledgebase/categories/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->categoriesUpdate($request, (int) $id);
        },
        Permissions::ADMIN_KNOWLEDGEBASE_CATEGORIES_EDIT,
        ['PATCH']
    );

    // DELETE - DELETE /api/admin/knowledgebase/categories/{id}
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-knowledgebase-categories-delete',
        '/api/admin/knowledgebase/categories/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->categoriesDelete($request, (int) $id);
        },
        Permissions::ADMIN_KNOWLEDGEBASE_CATEGORIES_DELETE,
        ['DELETE']
    );

    // ==================== ARTICLES ====================

    // LIST - GET /api/admin/knowledgebase/articles
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-knowledgebase-articles',
        '/api/admin/knowledgebase/articles',
        function (Request $request) {
            return (new KnowledgebaseController())->articlesIndex($request);
        },
        Permissions::ADMIN_KNOWLEDGEBASE_ARTICLES_VIEW,
    );

    // SHOW - GET /api/admin/knowledgebase/articles/{id}
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-knowledgebase-articles-show',
        '/api/admin/knowledgebase/articles/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->articlesShow($request, (int) $id);
        },
        Permissions::ADMIN_KNOWLEDGEBASE_ARTICLES_VIEW,
    );

    // CREATE - PUT /api/admin/knowledgebase/articles
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-knowledgebase-articles-create',
        '/api/admin/knowledgebase/articles',
        function (Request $request) {
            return (new KnowledgebaseController())->articlesCreate($request);
        },
        Permissions::ADMIN_KNOWLEDGEBASE_ARTICLES_CREATE,
        ['PUT']
    );

    // UPDATE - PATCH /api/admin/knowledgebase/articles/{id}
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-knowledgebase-articles-update',
        '/api/admin/knowledgebase/articles/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->articlesUpdate($request, (int) $id);
        },
        Permissions::ADMIN_KNOWLEDGEBASE_ARTICLES_EDIT,
        ['PATCH']
    );

    // DELETE - DELETE /api/admin/knowledgebase/articles/{id}
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-knowledgebase-articles-delete',
        '/api/admin/knowledgebase/articles/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->articlesDelete($request, (int) $id);
        },
        Permissions::ADMIN_KNOWLEDGEBASE_ARTICLES_DELETE,
        ['DELETE']
    );

    // ==================== FILE UPLOADS ====================

    // UPLOAD ICON - POST /api/admin/knowledgebase/upload-icon
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-knowledgebase-upload-icon',
        '/api/admin/knowledgebase/upload-icon',
        function (Request $request) {
            return (new KnowledgebaseController())->uploadIcon($request);
        },
        Permissions::ADMIN_KNOWLEDGEBASE_CATEGORIES_CREATE, // Use categories permission for icon uploads
        ['POST']
    );

    // UPLOAD ATTACHMENT - POST /api/admin/knowledgebase/articles/{id}/upload-attachment
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-knowledgebase-articles-upload-attachment',
        '/api/admin/knowledgebase/articles/{id}/upload-attachment',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->uploadAttachment($request, (int) $id);
        },
        Permissions::ADMIN_KNOWLEDGEBASE_ARTICLES_EDIT,
        ['POST']
    );

    // GET ATTACHMENTS - GET /api/admin/knowledgebase/articles/{id}/attachments
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-knowledgebase-articles-attachments',
        '/api/admin/knowledgebase/articles/{id}/attachments',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->getAttachments($request, (int) $id);
        },
        Permissions::ADMIN_KNOWLEDGEBASE_ARTICLES_VIEW,
    );

    // DELETE ATTACHMENT - DELETE /api/admin/knowledgebase/articles/{id}/attachments/{attachmentId}
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-knowledgebase-articles-delete-attachment',
        '/api/admin/knowledgebase/articles/{id}/attachments/{attachmentId}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            $attachmentId = $args['attachmentId'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid article ID', 'INVALID_ID', 400);
            }
            if (!$attachmentId || !is_numeric($attachmentId)) {
                return ApiResponse::error('Missing or invalid attachment ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->deleteAttachment($request, (int) $id, (int) $attachmentId);
        },
        Permissions::ADMIN_KNOWLEDGEBASE_ARTICLES_EDIT,
        ['DELETE']
    );

    // ==================== TAGS ====================

    // GET TAGS - GET /api/admin/knowledgebase/articles/{id}/tags
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-knowledgebase-articles-tags',
        '/api/admin/knowledgebase/articles/{id}/tags',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->getTags($request, (int) $id);
        },
        Permissions::ADMIN_KNOWLEDGEBASE_ARTICLES_VIEW,
    );

    // CREATE TAG - POST /api/admin/knowledgebase/articles/{id}/tags
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-knowledgebase-articles-create-tag',
        '/api/admin/knowledgebase/articles/{id}/tags',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->createTag($request, (int) $id);
        },
        Permissions::ADMIN_KNOWLEDGEBASE_ARTICLES_EDIT,
        ['POST']
    );

    // DELETE TAG - DELETE /api/admin/knowledgebase/articles/{id}/tags/{tagId}
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-knowledgebase-articles-delete-tag',
        '/api/admin/knowledgebase/articles/{id}/tags/{tagId}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            $tagId = $args['tagId'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid article ID', 'INVALID_ID', 400);
            }
            if (!$tagId || !is_numeric($tagId)) {
                return ApiResponse::error('Missing or invalid tag ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->deleteTag($request, (int) $id, (int) $tagId);
        },
        Permissions::ADMIN_KNOWLEDGEBASE_ARTICLES_EDIT,
        ['DELETE']
    );
};
