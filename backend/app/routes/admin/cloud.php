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
        'admin-cloud-data-product-releases',
        '/api/admin/cloud/data/products/{slug}/releases',
        static function (Request $request, string $slug) {
            return (new CloudDataController())->getProductReleases($request, $slug);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-product-release-download',
        '/api/admin/cloud/data/products/{slug}/releases/{version}/download',
        static function (Request $request, string $slug, string $version) {
            return (new CloudDataController())->downloadProductRelease($request, $slug, $version);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-product-reviews-get',
        '/api/admin/cloud/data/products/{slug}/reviews',
        static function (Request $request, string $slug) {
            return (new CloudDataController())->getProductReviews($request, $slug);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-product-reviews-post',
        '/api/admin/cloud/data/products/{slug}/reviews',
        static function (Request $request, string $slug) {
            return (new CloudDataController())->createProductReview($request, $slug);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-product-reviews-delete',
        '/api/admin/cloud/data/products/{slug}/reviews/{reviewId}',
        static function (Request $request, string $slug, string $reviewId) {
            return (new CloudDataController())->deleteProductReview($request, $slug, $reviewId);
        },
        Permissions::ADMIN_ROOT,
        ['DELETE'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-download-package',
        '/api/admin/cloud/data/download/{packageName}/{version}',
        static function (Request $request, string $packageName, string $version) {
            return (new CloudDataController())->downloadPackage($request, $packageName, $version);
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
        static function (Request $request, string $id) {
            return (new CloudDataController())->getEgg($request, $id);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-eggs-download',
        '/api/admin/cloud/data/eggs/{id}/download',
        static function (Request $request, string $id) {
            return (new CloudDataController())->downloadEgg($request, $id);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-egg-reviews-get',
        '/api/admin/cloud/data/eggs/{id}/reviews',
        static function (Request $request, string $id) {
            return (new CloudDataController())->getEggReviews($request, $id);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-egg-reviews-post',
        '/api/admin/cloud/data/eggs/{id}/reviews',
        static function (Request $request, string $id) {
            return (new CloudDataController())->createEggReview($request, $id);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-egg-reviews-delete',
        '/api/admin/cloud/data/eggs/{id}/reviews',
        static function (Request $request, string $id) {
            return (new CloudDataController())->deleteEggReview($request, $id);
        },
        Permissions::ADMIN_ROOT,
        ['DELETE'],
    );

    // Mythic Translations (public upstream — no panel keys)
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
        static function (Request $request, string $slug) {
            return (new \App\Controllers\Admin\MythicTranslationsController())->getProject($request, $slug);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-translations-locales',
        '/api/admin/cloud/translations/projects/{slug}/locales',
        static function (Request $request, string $slug) {
            return (new \App\Controllers\Admin\MythicTranslationsController())->listLocales($request, $slug);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-translations-locale-get',
        '/api/admin/cloud/translations/projects/{slug}/locales/{locale}',
        static function (Request $request, string $slug, string $locale) {
            return (new \App\Controllers\Admin\MythicTranslationsController())->getLocale($request, $slug, $locale);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-translations-locale-download',
        '/api/admin/cloud/translations/projects/{slug}/locales/{locale}/download',
        static function (Request $request, string $slug, string $locale) {
            return (new \App\Controllers\Admin\MythicTranslationsController())->downloadLocale($request, $slug, $locale);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-translations-locale-install',
        '/api/admin/cloud/translations/projects/{slug}/locales/{locale}/install',
        static function (Request $request, string $slug, string $locale) {
            return (new \App\Controllers\Admin\MythicTranslationsController())->installLocale($request, $slug, $locale);
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
        static function (Request $request, string $id) {
            return (new CloudDataController())->getPaste($request, $id);
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
        static function (Request $request, string $project) {
            return (new CloudDataController())->listIssues($request, $project);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-issues-create',
        '/api/admin/cloud/data/issues/{project}',
        static function (Request $request, string $project) {
            return (new CloudDataController())->createIssue($request, $project);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-issues-get',
        '/api/admin/cloud/data/issues/{project}/{number}',
        static function (Request $request, string $project, string $number) {
            return (new CloudDataController())->getIssue($request, $project, $number);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-issues-comment',
        '/api/admin/cloud/data/issues/{project}/{number}/comments',
        static function (Request $request, string $project, string $number) {
            return (new CloudDataController())->commentOnIssue($request, $project, $number);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );
};
