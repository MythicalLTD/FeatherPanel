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
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\Admin\CloudDataController;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\CloudManagementController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-credentials',
        '/api/admin/cloud/credentials',
        static function (Request $request) {
            return (new CloudManagementController())->show($request);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-credentials-panel',
        '/api/admin/cloud/credentials/panel',
        static function (Request $request) {
            return (new CloudManagementController())->storePanel($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PUT'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-credentials-cloud',
        '/api/admin/cloud/credentials/cloud',
        static function (Request $request) {
            return (new CloudManagementController())->storeCloud($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PUT'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-credentials-rotate',
        '/api/admin/cloud/credentials/rotate',
        static function (Request $request) {
            return (new CloudManagementController())->rotate($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-oauth2-link',
        '/api/admin/cloud/oauth2/link',
        static function (Request $request) {
            return (new CloudManagementController())->getOAuth2Link($request);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-oauth2-callback',
        '/api/admin/cloud/oauth2/callback',
        static function (Request $request) {
            return (new CloudManagementController())->saveOAuth2Callback($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-disconnect',
        '/api/admin/cloud/disconnect',
        static function (Request $request) {
            return (new CloudManagementController())->disconnect($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-settings-get',
        '/api/admin/cloud/settings',
        static function (Request $request) {
            return (new CloudManagementController())->getSettings($request);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-settings-put',
        '/api/admin/cloud/settings',
        static function (Request $request) {
            return (new CloudManagementController())->updateSettings($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PUT'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-members-sync',
        '/api/admin/cloud/members/sync',
        static function (Request $request) {
            return (new CloudManagementController())->syncMembers($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-sync',
        '/api/admin/cloud/sync',
        static function (Request $request) {
            return (new CloudManagementController())->syncNow($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST'],
    );

    // Cloud Data Endpoints (Admin Root Only)
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-summary',
        '/api/admin/cloud/data/summary',
        static function (Request $request) {
            return (new CloudDataController())->getSummary($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-cloud',
        '/api/admin/cloud/data/cloud',
        static function (Request $request) {
            return (new CloudDataController())->getCloud($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-credits',
        '/api/admin/cloud/data/credits',
        static function (Request $request) {
            return (new CloudDataController())->getCredits($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-team',
        '/api/admin/cloud/data/team',
        static function (Request $request) {
            return (new CloudDataController())->getTeam($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-products',
        '/api/admin/cloud/data/products',
        static function (Request $request) {
            return (new CloudDataController())->getProducts($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-store',
        '/api/admin/cloud/data/store',
        static function (Request $request) {
            return (new CloudDataController())->getStore($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-store-product',
        '/api/admin/cloud/data/store/products/{slug}',
        static function (Request $request, array $args) {
            return (new CloudDataController())->getStoreProduct($request, (string) ($args['slug'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-store-product-versions',
        '/api/admin/cloud/data/store/products/{slug}/versions',
        static function (Request $request, array $args) {
            return (new CloudDataController())->getStoreProductVersions($request, (string) ($args['slug'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-store-product-reviews-get',
        '/api/admin/cloud/data/store/products/{slug}/reviews',
        static function (Request $request, array $args) {
            return (new CloudDataController())->getStoreProductReviews($request, (string) ($args['slug'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-store-product-reviews-post',
        '/api/admin/cloud/data/store/products/{slug}/reviews',
        static function (Request $request, array $args) {
            return (new CloudDataController())->createStoreProductReview($request, (string) ($args['slug'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-store-product-questions-get',
        '/api/admin/cloud/data/store/products/{slug}/questions',
        static function (Request $request, array $args) {
            return (new CloudDataController())->getStoreProductQuestions($request, (string) ($args['slug'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-store-product-questions-post',
        '/api/admin/cloud/data/store/products/{slug}/questions',
        static function (Request $request, array $args) {
            return (new CloudDataController())->createStoreProductQuestion($request, (string) ($args['slug'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-store-product-question-reply',
        '/api/admin/cloud/data/store/products/{slug}/questions/{questionId}/replies',
        static function (Request $request, array $args) {
            return (new CloudDataController())->replyStoreProductQuestion(
                $request,
                (string) ($args['slug'] ?? ''),
                (string) ($args['questionId'] ?? '')
            );
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-product-releases',
        '/api/admin/cloud/data/products/{slug}/releases',
        static function (Request $request, array $args) {
            return (new CloudDataController())->getProductReleases($request, (string) ($args['slug'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-product-release-download',
        '/api/admin/cloud/data/products/{slug}/releases/{version}/download',
        static function (Request $request, array $args) {
            return (new CloudDataController())->downloadProductRelease(
                $request,
                (string) ($args['slug'] ?? ''),
                (string) ($args['version'] ?? '')
            );
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-product-reviews-get',
        '/api/admin/cloud/data/products/{slug}/reviews',
        static function (Request $request, array $args) {
            return (new CloudDataController())->getProductReviews($request, (string) ($args['slug'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-product-reviews-post',
        '/api/admin/cloud/data/products/{slug}/reviews',
        static function (Request $request, array $args) {
            return (new CloudDataController())->createProductReview($request, (string) ($args['slug'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-product-reviews-delete',
        '/api/admin/cloud/data/products/{slug}/reviews/{reviewId}',
        static function (Request $request, array $args) {
            return (new CloudDataController())->deleteProductReview(
                $request,
                (string) ($args['slug'] ?? ''),
                (string) ($args['reviewId'] ?? '')
            );
        },
        Permissions::ADMIN_ROOT,
        ['DELETE'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-download-package',
        '/api/admin/cloud/data/download/{packageName}/{version}',
        static function (Request $request, array $args) {
            return (new CloudDataController())->downloadPackage(
                $request,
                (string) ($args['packageName'] ?? ''),
                (string) ($args['version'] ?? '')
            );
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-eggs',
        '/api/admin/cloud/data/eggs',
        static function (Request $request) {
            return (new CloudDataController())->listEggs($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-egg-get',
        '/api/admin/cloud/data/eggs/{id}',
        static function (Request $request, array $args) {
            return (new CloudDataController())->getEgg($request, (string) ($args['id'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-eggs-download',
        '/api/admin/cloud/data/eggs/{id}/download',
        static function (Request $request, array $args) {
            return (new CloudDataController())->downloadEgg($request, (string) ($args['id'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-egg-reviews-get',
        '/api/admin/cloud/data/eggs/{id}/reviews',
        static function (Request $request, array $args) {
            return (new CloudDataController())->getEggReviews($request, (string) ($args['id'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-egg-reviews-post',
        '/api/admin/cloud/data/eggs/{id}/reviews',
        static function (Request $request, array $args) {
            return (new CloudDataController())->createEggReview($request, (string) ($args['id'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-egg-reviews-delete',
        '/api/admin/cloud/data/eggs/{id}/reviews',
        static function (Request $request, array $args) {
            return (new CloudDataController())->deleteEggReview($request, (string) ($args['id'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
        ['DELETE'],
    );

    // Mythic Translations (public upstream no panel keys)
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-translations-settings',
        '/api/admin/cloud/translations/settings',
        static function (Request $request) {
            return (new \App\Controllers\Admin\MythicTranslationsController())->getSettings($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-translations-projects',
        '/api/admin/cloud/translations/projects',
        static function (Request $request) {
            return (new \App\Controllers\Admin\MythicTranslationsController())->listProjects($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-translations-project',
        '/api/admin/cloud/translations/projects/{slug}',
        static function (Request $request, array $args) {
            return (new \App\Controllers\Admin\MythicTranslationsController())->getProject($request, (string) ($args['slug'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-translations-locales',
        '/api/admin/cloud/translations/projects/{slug}/locales',
        static function (Request $request, array $args) {
            return (new \App\Controllers\Admin\MythicTranslationsController())->listLocales($request, (string) ($args['slug'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-translations-locale-get',
        '/api/admin/cloud/translations/projects/{slug}/locales/{locale}',
        static function (Request $request, array $args) {
            return (new \App\Controllers\Admin\MythicTranslationsController())->getLocale(
                $request,
                (string) ($args['slug'] ?? ''),
                (string) ($args['locale'] ?? '')
            );
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-translations-locale-download',
        '/api/admin/cloud/translations/projects/{slug}/locales/{locale}/download',
        static function (Request $request, array $args) {
            return (new \App\Controllers\Admin\MythicTranslationsController())->downloadLocale(
                $request,
                (string) ($args['slug'] ?? ''),
                (string) ($args['locale'] ?? '')
            );
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-translations-locale-install',
        '/api/admin/cloud/translations/projects/{slug}/locales/{locale}/install',
        static function (Request $request, array $args) {
            return (new \App\Controllers\Admin\MythicTranslationsController())->installLocale(
                $request,
                (string) ($args['slug'] ?? ''),
                (string) ($args['locale'] ?? '')
            );
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-pastes-create',
        '/api/admin/cloud/data/pastes',
        static function (Request $request) {
            return (new CloudDataController())->createPaste($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-pastes-get',
        '/api/admin/cloud/data/pastes/{id}',
        static function (Request $request, array $args) {
            return (new CloudDataController())->getPaste($request, (string) ($args['id'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-issues-projects',
        '/api/admin/cloud/data/issues/projects',
        static function (Request $request) {
            return (new CloudDataController())->listIssueProjects($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-report',
        '/api/admin/cloud/data/report',
        static function (Request $request) {
            return (new CloudDataController())->reportIssue($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-suggestion',
        '/api/admin/cloud/data/suggestion',
        static function (Request $request) {
            return (new CloudDataController())->submitSuggestion($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-issues-list',
        '/api/admin/cloud/data/issues/{project}',
        static function (Request $request, array $args) {
            return (new CloudDataController())->listIssues($request, (string) ($args['project'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-issues-create',
        '/api/admin/cloud/data/issues/{project}',
        static function (Request $request, array $args) {
            return (new CloudDataController())->createIssue($request, (string) ($args['project'] ?? ''));
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-issues-get',
        '/api/admin/cloud/data/issues/{project}/{number}',
        static function (Request $request, array $args) {
            return (new CloudDataController())->getIssue(
                $request,
                (string) ($args['project'] ?? ''),
                (string) ($args['number'] ?? '')
            );
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-issues-comment',
        '/api/admin/cloud/data/issues/{project}/{number}/comments',
        static function (Request $request, array $args) {
            return (new CloudDataController())->commentOnIssue(
                $request,
                (string) ($args['project'] ?? ''),
                (string) ($args['number'] ?? '')
            );
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );
};
