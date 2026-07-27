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
use App\Chat\Database;
use App\Helpers\ApiResponse;
use App\Chat\InstalledPlugin;
use OpenApi\Attributes as OA;
use App\Helpers\PanelAssetUrl;
use App\Helpers\AddonPackageHelper;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\CloudPluginsEvent;
use App\Services\FeatherCloud\FeatherCloudClient;
use App\Services\FeatherCloud\FeatherCloudException;

#[OA\Schema(
    schema: 'OnlineAddon',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Addon ID'),
        new OA\Property(property: 'identifier', type: 'string', description: 'Addon identifier'),
        new OA\Property(property: 'name', type: 'string', description: 'Addon display name'),
        new OA\Property(property: 'description', type: 'string', description: 'Addon description'),
        new OA\Property(property: 'icon', type: 'string', nullable: true, description: 'Addon icon URL'),
        new OA\Property(property: 'website', type: 'string', description: 'Addon website URL'),
        new OA\Property(property: 'author', type: 'string', description: 'Addon author'),
        new OA\Property(property: 'author_email', type: 'string', description: 'Author email'),
        new OA\Property(property: 'maintainers', type: 'array', items: new OA\Items(type: 'string'), description: 'Addon maintainers'),
        new OA\Property(property: 'tags', type: 'array', items: new OA\Items(type: 'string'), description: 'Addon tags'),
        new OA\Property(property: 'verified', type: 'boolean', description: 'Whether addon is verified'),
        new OA\Property(property: 'premium', type: 'integer', description: 'Whether addon is premium (0 = free, 1 = premium)'),
        new OA\Property(property: 'premium_link', type: 'string', description: 'Purchase link for premium addon'),
        new OA\Property(property: 'premium_price', type: 'string', description: 'Price for premium addon in EUR'),
        new OA\Property(property: 'downloads', type: 'integer', description: 'Download count'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
        new OA\Property(
            property: 'latest_version',
            type: 'object',
            nullable: true,
            description: 'Latest published version metadata when available',
            properties: [
                new OA\Property(property: 'version', type: 'string', nullable: true, description: 'Latest version number'),
                new OA\Property(property: 'download_url', type: 'string', nullable: true, description: 'Download URL'),
                new OA\Property(property: 'file_size', type: 'integer', nullable: true, description: 'File size in bytes'),
                new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true, description: 'Version creation timestamp'),
                new OA\Property(property: 'changelog', type: 'string', nullable: true),
                new OA\Property(
                    property: 'dependencies',
                    type: 'array',
                    items: new OA\Items(type: 'object'),
                    nullable: true
                ),
                new OA\Property(property: 'min_panel_version', type: 'string', nullable: true),
                new OA\Property(property: 'max_panel_version', type: 'string', nullable: true),
            ]
        ),
    ]
)]
#[OA\Schema(
    schema: 'OnlineInstall',
    type: 'object',
    required: ['identifier'],
    properties: [
        new OA\Property(property: 'identifier', type: 'string', description: 'Addon identifier to install', pattern: '^[a-zA-Z0-9_\\-]+$'),
        new OA\Property(
            property: 'queued_identifiers',
            type: 'array',
            items: new OA\Items(type: 'string'),
            description: 'Identifiers selected for the same install session; plugin= dependencies in this list are installed automatically before this addon when missing.'
        ),
    ]
)]
class CloudPluginsController
{
    /**
     * Oh, hello there, curious skiddie!
     *
     * You've found the ultra-top-secret addon installer password.
     * Congrats. This means:
     *  1. You can open a ZIP file, and
     *  2. You love poking around in code that isn't yours.
     *
     * Yes, .fpa files are literally password-protected ZIPs.
     * No, this isn't Fort Knox—just a speed bump for script kiddies like you.
     *
     * If you're READING this, hats off: you're not just any skid, you're LEVEL 2.
     * Maybe even aspiring to the boss round of Skid Life.
     *
     * If you insist on "borrowing"—try not to embarrass yourself by flexing this as your work.
     * (Bonus points if you actually contribute instead of vandalize.)
     *
     * Now please enjoy your exclusive invite to the “Skid Hall of Fame.” 😉
     */
    public const PASSWORD = 'featherpanel_development_kit_2025_addon_password';

    private static ?self $instance = null;

    #[OA\Get(
        path: '/api/admin/plugins/online/list',
        summary: 'Get online addons list',
        description: 'Retrieve a paginated list of Mythic marketplace products available to the linked team (GET /panel/products).',
        tags: ['Admin - Cloud Plugins'],
        parameters: [
            new OA\Parameter(
                name: 'q',
                in: 'query',
                description: 'Search query to filter addons',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'page',
                in: 'query',
                description: 'Page number for pagination',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)
            ),
            new OA\Parameter(
                name: 'per_page',
                in: 'query',
                description: 'Number of addons per page',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 20)
            ),
            new OA\Parameter(
                name: 'verified_only',
                in: 'query',
                description: 'If true, only return verified packages',
                required: false,
                schema: new OA\Schema(type: 'boolean', default: false)
            ),
            new OA\Parameter(
                name: 'tags',
                in: 'query',
                description: 'Comma-separated list of tags to filter by',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'sort_by',
                in: 'query',
                description: 'Field to sort by (created_at, downloads, updated_at)',
                required: false,
                schema: new OA\Schema(type: 'string', enum: ['created_at', 'downloads', 'updated_at'], default: 'created_at')
            ),
            new OA\Parameter(
                name: 'sort_order',
                in: 'query',
                description: 'Sort order',
                required: false,
                schema: new OA\Schema(type: 'string', enum: ['ASC', 'DESC'], default: 'DESC')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Online addons retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'addons', type: 'array', items: new OA\Items(ref: '#/components/schemas/OnlineAddon')),
                        new OA\Property(property: 'pagination', type: 'object', description: 'Pagination metadata'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to fetch online addons or invalid response'),
        ]
    )]
    public function list(Request $request): Response
    {
        try {
            $client = new FeatherCloudClient();
            if (!$client->isConfigured()) {
                return $this->credentialsRequiredResponse();
            }

            $q = trim((string) ($request->query->get('q') ?? ''));
            $page = max(1, (int) ($request->query->get('page') ?? 1));
            $perPage = max(1, (int) ($request->query->get('per_page') ?? 20));
            $verifiedOnly = $request->query->get('verified_only') === 'true' || $request->query->get('verified_only') === '1';
            $tags = trim((string) ($request->query->get('tags') ?? ''));
            $sortBy = trim((string) ($request->query->get('sort_by') ?? 'created_at'));
            $sortOrder = strtoupper(trim((string) ($request->query->get('sort_order') ?? 'DESC')));

            $addons = $this->listMythicAddons($client);
            $addons = $this->filterMythicAddons($addons, $q, $verifiedOnly, $tags !== '' ? array_map('trim', explode(',', $tags)) : []);
            $addons = $this->sortMythicAddons($addons, $sortBy, $sortOrder);

            $total = count($addons);
            $offset = ($page - 1) * $perPage;
            $pageItems = array_slice($addons, $offset, $perPage);
            $totalPages = max(1, (int) ceil($total / $perPage));

            return ApiResponse::success([
                'addons' => array_values($pageItems),
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'total_pages' => $totalPages,
                    'has_next' => $page < $totalPages,
                    'has_prev' => $page > 1,
                ],
            ], 'Online addons fetched', 200);
        } catch (FeatherCloudException $e) {
            return $this->mythicErrorResponse($e);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to fetch online addons: ' . $e->getMessage());

            return ApiResponse::error('Failed to fetch online addons: ' . $e->getMessage(), 'ONLINE_LIST_FETCH_FAILED', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/plugins/previously-installed',
        summary: 'Get previously installed plugins',
        description: 'Retrieve a list of plugins that were previously installed (including uninstalled ones) to help users restore them after FeatherPanel updates.',
        tags: ['Admin - Plugins'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Previously installed plugins retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'plugins', type: 'array', items: new OA\Items(type: 'object', properties: [
                            new OA\Property(property: 'id', type: 'integer', description: 'Record ID'),
                            new OA\Property(property: 'name', type: 'string', description: 'Plugin name'),
                            new OA\Property(property: 'identifier', type: 'string', description: 'Plugin identifier'),
                            new OA\Property(property: 'cloud_id', type: 'integer', nullable: true, description: 'Cloud registry ID'),
                            new OA\Property(property: 'version', type: 'string', nullable: true, description: 'Plugin version'),
                            new OA\Property(property: 'installed_at', type: 'string', format: 'date-time', description: 'Installation timestamp'),
                            new OA\Property(property: 'uninstalled_at', type: 'string', format: 'date-time', nullable: true, description: 'Uninstallation timestamp'),
                        ])),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function getPreviouslyInstalled(Request $request): Response
    {
        try {
            $plugins = InstalledPlugin::getAllPreviouslyInstalledPlugins();

            return ApiResponse::success([
                'plugins' => $plugins,
            ], 'Previously installed plugins retrieved successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch previously installed plugins: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/plugins/online/popular',
        summary: 'Get popular packages',
        description: 'Retrieve Mythic team products sorted for the popular addons carousel.',
        tags: ['Admin - Cloud Plugins'],
        parameters: [
            new OA\Parameter(
                name: 'limit',
                in: 'query',
                description: 'Number of packages to return',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 50, default: 10)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Popular packages retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'addons', type: 'array', items: new OA\Items(ref: '#/components/schemas/OnlineAddon')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function popular(Request $request): Response
    {
        try {
            $client = new FeatherCloudClient();
            if (!$client->isConfigured()) {
                return $this->credentialsRequiredResponse();
            }

            $limit = (int) ($request->query->get('limit') ?? 10);
            if ($limit < 1) {
                $limit = 10;
            }
            if ($limit > 50) {
                $limit = 50;
            }

            $addons = $this->listMythicAddons($client);
            $addons = $this->sortMythicAddons($addons, 'downloads', 'DESC');
            $addons = array_slice($addons, 0, $limit);

            return ApiResponse::success(['addons' => array_values($addons)], 'Popular packages fetched', 200);
        } catch (FeatherCloudException $e) {
            return $this->mythicErrorResponse($e);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to fetch popular packages: ' . $e->getMessage());

            return ApiResponse::error('Failed to fetch popular packages: ' . $e->getMessage(), 'POPULAR_FETCH_FAILED', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/plugins/online/{identifier}',
        summary: 'Get package details',
        description: 'Retrieve Mythic product details and downloadable releases for a product slug.',
        tags: ['Admin - Cloud Plugins'],
        parameters: [
            new OA\Parameter(
                name: 'identifier',
                in: 'path',
                description: 'Package identifier name',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Package details retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'package', ref: '#/components/schemas/OnlineAddon'),
                        new OA\Property(property: 'versions', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Package not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function show(Request $request, string $identifier): Response
    {
        try {
            $client = new FeatherCloudClient();
            if (!$client->isConfigured()) {
                return $this->credentialsRequiredResponse();
            }

            $resolved = $this->resolveMythicProduct($client, $identifier);
            if ($resolved === null) {
                return ApiResponse::error('Package not found', 'PACKAGE_NOT_FOUND', 404);
            }

            $package = $resolved['addon'];
            $releases = $resolved['releases'];
            $formattedVersions = array_map(static fn (array $rel): array => self::normalizeReleaseAsVersion($rel), $releases);

            return ApiResponse::success([
                'package' => $package,
                'versions' => $formattedVersions,
            ], 'Package details fetched', 200);
        } catch (FeatherCloudException $e) {
            return $this->mythicErrorResponse($e);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to fetch package details for ' . $identifier . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to fetch package details: ' . $e->getMessage(), 'PACKAGE_DETAILS_FETCH_FAILED', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/plugins/online/tag/{tag}',
        summary: 'Search packages by tag',
        description: 'Filter Mythic team products by tag.',
        tags: ['Admin - Cloud Plugins'],
        parameters: [
            new OA\Parameter(
                name: 'tag',
                in: 'path',
                description: 'Tag name to search for',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'page',
                in: 'query',
                description: 'Page number for pagination',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)
            ),
            new OA\Parameter(
                name: 'per_page',
                in: 'query',
                description: 'Number of addons per page',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 20)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Packages by tag retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'addons', type: 'array', items: new OA\Items(ref: '#/components/schemas/OnlineAddon')),
                        new OA\Property(property: 'tag', type: 'string'),
                        new OA\Property(property: 'pagination', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function searchByTag(Request $request, string $tag): Response
    {
        try {
            $client = new FeatherCloudClient();
            if (!$client->isConfigured()) {
                return $this->credentialsRequiredResponse();
            }

            $page = max(1, (int) ($request->query->get('page') ?? 1));
            $perPage = max(1, (int) ($request->query->get('per_page') ?? 20));

            $addons = $this->filterMythicAddons($this->listMythicAddons($client), '', false, [$tag]);
            $total = count($addons);
            $offset = ($page - 1) * $perPage;
            $pageItems = array_slice($addons, $offset, $perPage);
            $totalPages = max(1, (int) ceil($total / $perPage));

            return ApiResponse::success([
                'addons' => array_values($pageItems),
                'tag' => $tag,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'total_pages' => $totalPages,
                    'has_next' => $page < $totalPages,
                    'has_prev' => $page > 1,
                ],
            ], 'Packages by tag fetched', 200);
        } catch (FeatherCloudException $e) {
            return $this->mythicErrorResponse($e);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to fetch packages by tag ' . $tag . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to fetch packages by tag: ' . $e->getMessage(), 'TAG_FETCH_FAILED', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/plugins/online/{identifier}/check',
        summary: 'Check addon installation requirements',
        description: 'Check if all dependencies and requirements are met before installing an addon. Returns dependency status, panel version compatibility, and installation readiness.',
        tags: ['Admin - Cloud Plugins'],
        parameters: [
            new OA\Parameter(
                name: 'identifier',
                in: 'path',
                description: 'Package identifier name',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'pending_plugins',
                in: 'query',
                description: 'Comma-separated addon identifiers also queued for install; plugin= dependencies in this list count as satisfied.',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Requirements check completed',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'can_install', type: 'boolean', description: 'Whether the addon can be installed'),
                        new OA\Property(property: 'package', type: 'object', description: 'Package information'),
                        new OA\Property(property: 'dependencies', type: 'object', description: 'Dependency information'),
                        new OA\Property(property: 'panel_version', type: 'object', description: 'Panel version compatibility'),
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'Package not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function checkRequirements(Request $request, string $identifier): Response
    {
        try {
            $client = new FeatherCloudClient();
            if (!$client->isConfigured()) {
                return $this->credentialsRequiredResponse();
            }

            $resolved = $this->resolveMythicProduct($client, $identifier);
            if ($resolved === null) {
                return ApiResponse::error('Package not found', 'PACKAGE_NOT_FOUND', 404);
            }

            $pkg = $resolved['product'];
            $addon = $resolved['addon'];
            $latestVersion = is_array($addon['latest_version'] ?? null) ? $addon['latest_version'] : [];
            $latestVersionString = (string) ($latestVersion['version'] ?? '');
            $storeSlug = $this->productSlug(is_array($pkg) ? $pkg : []);
            if ($storeSlug === '' && is_array($addon)) {
                $storeSlug = trim((string) ($addon['store_slug'] ?? ''));
            }
            if ($storeSlug === '') {
                $storeSlug = (string) $identifier;
            }
            $localIdentifier = $this->pluginIdentifier(is_array($pkg) ? $pkg : []);
            if ($localIdentifier === '' && is_array($addon)) {
                $localIdentifier = trim((string) ($addon['identifier'] ?? ''));
            }
            if ($localIdentifier === '') {
                $localIdentifier = (string) $identifier;
            }

            // Check if already installed and get installed version
            if (!defined('APP_ADDONS_DIR')) {
                define('APP_ADDONS_DIR', dirname(__DIR__, 3) . '/storage/addons');
            }
            $pluginDir = APP_ADDONS_DIR . '/' . $localIdentifier;
            $alreadyInstalled = file_exists($pluginDir);
            $installedVersion = null;
            $updateAvailable = false;

            if ($alreadyInstalled) {
                try {
                    $installedConfig = \App\Plugins\PluginConfig::getConfig($localIdentifier);
                    $installedVersion = $installedConfig['plugin']['version'] ?? null;

                    if ($installedVersion && $latestVersionString !== '') {
                        $normalizeVersion = static function (string $version): string {
                            return ltrim($version, 'vV');
                        };
                        $installedNormalized = $normalizeVersion($installedVersion);
                        $latestNormalized = $normalizeVersion($latestVersionString);

                        if (version_compare($latestNormalized, $installedNormalized, '>')) {
                            $updateAvailable = true;
                        }
                    }
                } catch (\Exception $e) {
                    // Failed to read installed version, assume no update
                }
            }

            $dependencies = $latestVersion['dependencies'] ?? [];
            $minPanelVersion = $latestVersion['min_panel_version'] ?? null;
            $maxPanelVersion = $latestVersion['max_panel_version'] ?? null;

            $panelVersionOk = true;
            $panelVersionMessage = null;
            if ($minPanelVersion || $maxPanelVersion) {
                $currentVersion = defined('APP_VERSION') ? APP_VERSION : 'unknown';
                $normalizeVersion = static function (string $version): string {
                    return ltrim($version, 'vV');
                };

                $currentVersionNormalized = $normalizeVersion($currentVersion);
                $displayVersion = $currentVersion;

                if ($minPanelVersion) {
                    $minVersionNormalized = $normalizeVersion((string) $minPanelVersion);
                    if (version_compare($currentVersionNormalized, $minVersionNormalized, '<')) {
                        $panelVersionOk = false;
                        $panelVersionMessage = "Requires panel version {$minPanelVersion} or higher (current: {$displayVersion})";
                    }
                }
                if ($maxPanelVersion) {
                    $maxVersionNormalized = $normalizeVersion((string) $maxPanelVersion);
                    if (version_compare($currentVersionNormalized, $maxVersionNormalized, '>')) {
                        $panelVersionOk = false;
                        $panelVersionMessage = "Requires panel version {$maxPanelVersion} or lower (current: {$displayVersion})";
                    }
                }
            }

            $eval = ['checks' => [], 'all_met' => true, 'missing' => []];
            if ($latestVersionString !== '') {
                $eval = $this->evaluateConfDependencyChecksForProduct($client, $storeSlug, $latestVersionString);
            }
            $dependencyChecks = $eval['checks'];
            $allDependenciesMet = $eval['all_met'];
            $pendingQueued = $this->parsePendingPluginsQuery($request);
            foreach ($dependencyChecks as &$depRow) {
                if (($depRow['type'] ?? '') === 'plugin' && !($depRow['met'] ?? false) && in_array($depRow['name'], $pendingQueued, true)) {
                    $depRow['met'] = true;
                    $depRow['message'] = 'Queued in your download list (will be installed in the same session)';
                }
            }
            unset($depRow);
            $allDependenciesMet = true;
            foreach ($dependencyChecks as $depRow) {
                if (!($depRow['met'] ?? false)) {
                    $allDependenciesMet = false;
                    break;
                }
            }

            $canInstall = (!$alreadyInstalled || $updateAvailable) && $panelVersionOk && $allDependenciesMet;
            $isPremium = (int) ($addon['premium'] ?? 0) === 1;

            return ApiResponse::success([
                'can_install' => $canInstall,
                'already_installed' => $alreadyInstalled,
                'update_available' => $updateAvailable,
                'installed_version' => $installedVersion,
                'latest_version' => $latestVersionString !== '' ? $latestVersionString : null,
                'package' => [
                    'identifier' => $localIdentifier,
                    'store_slug' => $storeSlug,
                    'name' => $addon['name'] ?? ($pkg['name'] ?? ''),
                    'description' => $addon['description'] ?? ($pkg['description'] ?? null),
                    'version' => $latestVersionString !== '' ? $latestVersionString : null,
                    'author' => $addon['author'] ?? ($pkg['author'] ?? null),
                    'verified' => (bool) ($addon['verified'] ?? false),
                    'premium' => $isPremium ? 1 : 0,
                ],
                'dependencies' => [
                    'checks' => $dependencyChecks,
                    'all_met' => $allDependenciesMet,
                ],
                'panel_version' => [
                    'ok' => $panelVersionOk,
                    'message' => $panelVersionMessage,
                    'min' => $minPanelVersion,
                    'max' => $maxPanelVersion,
                ],
            ], 'Requirements check completed', 200);
        } catch (FeatherCloudException $e) {
            return $this->mythicErrorResponse($e);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to check requirements for ' . $identifier . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to check requirements: ' . $e->getMessage(), 'REQUIREMENTS_CHECK_FAILED', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/plugins/online/install',
        summary: 'Install addon from online registry',
        description: 'Download and install an addon from Mythic marketplace releases (GET /panel/products/{slug}/releases/{version}/download).',
        tags: ['Admin - Cloud Plugins'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/OnlineInstall')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Addon installed successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'identifier', type: 'string', description: 'Installed addon identifier'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid identifier format'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(
                response: 402,
                description: 'Payment Required - Premium addon must be purchased',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'premium_link', type: 'string', description: 'Purchase link for premium addon'),
                        new OA\Property(property: 'premium_price', type: 'string', description: 'Price in EUR'),
                    ]
                )
            ),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Package not found in registry'),
            new OA\Response(response: 409, description: 'Conflict - Addon already installed'),
            new OA\Response(
                response: 412,
                description: 'Precondition Failed - Dependencies not met',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'missing_dependencies', type: 'array', items: new OA\Items(type: 'string'), description: 'List of missing dependencies'),
                        new OA\Property(property: 'dependency_details', type: 'array', items: new OA\Items(type: 'object'), description: 'Detailed dependency check results'),
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Unprocessable Entity - Failed to extract addon package or migrations failed'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to install addon or download failed'),
        ]
    )]
    public function install(Request $request): Response
    {
        try {
            $body = json_decode($request->getContent(), true);
            if (!is_array($body)) {
                $body = [];
            }
            $identifier = $body['identifier'] ?? null;
            if (!$identifier || !preg_match('/^[a-zA-Z0-9_\-]+$/', (string) $identifier)) {
                return ApiResponse::error('Invalid identifier', 'INVALID_IDENTIFIER', 400);
            }

            $installStack = $request->attributes->get('_fp_install_stack', []);
            if (!is_array($installStack)) {
                $installStack = [];
            }
            if (isset($installStack[$identifier])) {
                return ApiResponse::error(
                    'Circular dependency when resolving queued plugin installations. Install one of the queued plugins first, or adjust your download list.',
                    'PLUGIN_INSTALL_QUEUE_CYCLE',
                    400
                );
            }
            $installStack[$identifier] = true;
            $request->attributes->set('_fp_install_stack', $installStack);

            $queuedIdentifiers = $this->normalizeQueuedPluginIdentifiers($body['queued_identifiers'] ?? []);

            if (!defined('APP_ADDONS_DIR')) {
                define('APP_ADDONS_DIR', dirname(__DIR__, 3) . '/storage/addons');
            }

            // Ensure addons dir exists
            if (!is_dir(APP_ADDONS_DIR) && !@mkdir(APP_ADDONS_DIR, 0755, true)) {
                return ApiResponse::error('Failed to prepare addons directory', 'ADDONS_DIR_CREATE_FAILED', 500);
            }

            // Fetch product metadata + releases from Mythic Panel API
            $client = new FeatherCloudClient();
            if (!$client->isConfigured()) {
                return $this->credentialsRequiredResponse([
                    'premium_link' => null,
                    'premium_price' => null,
                ]);
            }

            try {
                $resolved = $this->resolveMythicProduct($client, (string) $identifier);
            } catch (FeatherCloudException $e) {
                return $this->mythicErrorResponse($e);
            }

            if ($resolved === null) {
                return ApiResponse::error('Package not found in registry', 'PACKAGE_NOT_FOUND', 404);
            }

            $pkg = $resolved['product'];
            $addon = $resolved['addon'];
            $storeSlug = $this->productSlug(is_array($pkg) ? $pkg : []);
            if ($storeSlug === '' && is_array($addon)) {
                $storeSlug = trim((string) ($addon['store_slug'] ?? ''));
            }
            if ($storeSlug === '') {
                $storeSlug = (string) $identifier;
            }
            $latestVersion = is_array($addon['latest_version'] ?? null) ? $addon['latest_version'] : [];
            $latestVersionString = (string) ($latestVersion['version'] ?? ($body['version'] ?? ''));

            // Resolve plugin= dependencies using the same download queue (install missing deps first)
            $dependencyChecks = [];
            $allDependenciesMet = false;

            for ($depResolveAttempt = 0; $depResolveAttempt < 32; ++$depResolveAttempt) {
                $eval = $latestVersionString !== ''
                    ? $this->evaluateConfDependencyChecksForProduct($client, $storeSlug, $latestVersionString)
                    : ['checks' => [], 'all_met' => true, 'missing' => []];
                $dependencyChecks = $eval['checks'];
                if ($eval['all_met']) {
                    $allDependenciesMet = true;
                    break;
                }

                $pluginToInstallFirst = null;
                foreach ($eval['checks'] as $check) {
                    if (($check['type'] ?? '') === 'plugin' && !($check['met'] ?? false) && in_array($check['name'], $queuedIdentifiers, true)) {
                        $pluginToInstallFirst = $check['name'];
                        break;
                    }
                }

                if ($pluginToInstallFirst === null) {
                    return ApiResponse::error(
                        'Cannot install plugin: missing dependencies',
                        'MISSING_DEPENDENCIES',
                        412,
                        [
                            'missing_dependencies' => $eval['missing'],
                            'dependency_details' => $eval['checks'],
                        ]
                    );
                }

                if (\App\Plugins\Dependencies\AppDependencies::isInstalled($pluginToInstallFirst)) {
                    continue;
                }

                $nestedPayload = json_encode([
                    'identifier' => $pluginToInstallFirst,
                    'queued_identifiers' => $queuedIdentifiers,
                ]);
                $nestedRequest = Request::create(
                    '/api/admin/plugins/online/install',
                    'POST',
                    [],
                    [],
                    [],
                    ['CONTENT_TYPE' => 'application/json'],
                    $nestedPayload
                );
                $nestedRequest->attributes->set('user', $request->attributes->get('user'));
                $nestedRequest->attributes->set('_fp_install_stack', $request->attributes->get('_fp_install_stack', []));

                $nestedResponse = $this->install($nestedRequest);
                if ($nestedResponse->getStatusCode() >= 400) {
                    return $nestedResponse;
                }
            }

            if (!$allDependenciesMet) {
                return ApiResponse::error(
                    'Unable to resolve plugin dependencies from the install queue',
                    'PLUGIN_DEPENDENCY_RESOLVE_LIMIT',
                    500,
                    [
                        'dependency_details' => $dependencyChecks,
                    ]
                );
            }

            $isPremium = (int) ($addon['premium'] ?? 0) === 1;
            $premiumLink = $addon['premium_link'] ?? ($pkg['premium_link'] ?? null);
            $premiumPrice = $addon['premium_price'] ?? ($pkg['premium_price'] ?? null);

            if ($latestVersionString === '') {
                return ApiResponse::error(
                    'Version is required to download this product release',
                    'VERSION_REQUIRED',
                    400,
                    [
                        'premium_link' => $premiumLink,
                        'premium_price' => $premiumPrice,
                    ]
                );
            }

            try {
                $fileContent = $client->downloadProductRelease($storeSlug, $latestVersionString);
            } catch (FeatherCloudException $e) {
                if ($e->getErrorCode() === 'CREDENTIALS_NOT_CONFIGURED') {
                    return $this->credentialsRequiredResponse([
                        'premium_link' => $premiumLink,
                        'premium_price' => $premiumPrice,
                    ]);
                }

                $status = $e->getHttpStatusCode() ?: ($isPremium ? 402 : 500);
                $code = $e->getErrorCode() ?: ($isPremium ? 'PREMIUM_ADDON_PURCHASE_REQUIRED' : 'ADDON_DOWNLOAD_FAILED');
                $message = $e->getMessage() ?: ($isPremium
                    ? 'This is a premium addon and must be purchased'
                    : 'Failed to download addon package');

                return ApiResponse::error(
                    $message,
                    $code,
                    $status,
                    [
                        'premium_link' => $premiumLink,
                        'premium_price' => $premiumPrice,
                    ]
                );
            }

            if ($fileContent === '') {
                return ApiResponse::error('Failed to download addon package', 'ADDON_DOWNLOAD_FAILED', 500);
            }

            $tempFile = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true) . '.fpa';
            file_put_contents($tempFile, $fileContent);

            // Extract (ZipArchive: AES marketplace packages + legacy ZipCrypto)
            $tempDir = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true);
            $extracted = AddonPackageHelper::extract($tempFile, $tempDir, self::PASSWORD);
            @unlink($tempFile);
            if (!$extracted) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to extract addon package', 'ADDON_EXTRACT_FAILED', 422);
            }

            $cloudId = null;
            if (isset($pkg['id']) && is_numeric($pkg['id'])) {
                $cloudId = (int) $pkg['id'];
            }
            $installResult = $this->performAddonInstall($tempDir, $identifier, $cloudId);

            // If install was successful, log activity and emit event
            if ($installResult->getStatusCode() === 200 || $installResult->getStatusCode() === 201) {
                $currentUser = $request->attributes->get('user');
                $responseData = json_decode($installResult->getContent(), true);
                $isUpdate = $responseData['data']['is_update'] ?? false;

                Activity::createActivity([
                    'user_uuid' => $currentUser['uuid'] ?? null,
                    'name' => $isUpdate ? 'cloud_plugin_updated' : 'cloud_plugin_installed',
                    'context' => ($isUpdate ? 'Updated' : 'Installed') . " cloud plugin: {$identifier}",
                    'ip_address' => CloudFlareRealIP::getRealIP(),
                ]);

                // Emit event
                global $eventManager;
                if (isset($eventManager) && $eventManager !== null) {
                    $eventManager->emit(
                        $isUpdate ? CloudPluginsEvent::onPluginInstalled() : CloudPluginsEvent::onPluginInstalled(),
                        [
                            'identifier' => $identifier,
                            'plugin_data' => $responseData['data'] ?? [],
                            'user_uuid' => $currentUser['uuid'] ?? null,
                        ]
                    );
                }
            }

            return $installResult;
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to install addon: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Perform the common installation routine given an extracted addon temp directory.
     * Handles identifier resolution (from conf.yml if not provided), copying files,
     * exposing public assets, running migrations, and calling the install hook.
     *
     * @param string $tempDir Temporary directory containing extracted addon
     * @param string|null $identifier Optional identifier (will be read from conf.yml if not provided)
     * @param int|null $cloudId Optional cloud registry ID for tracking
     */
    public function performAddonInstall(string $tempDir, ?string $identifier = null, ?int $cloudId = null): Response
    {
        try {
            if (!defined('APP_ADDONS_DIR')) {
                define('APP_ADDONS_DIR', dirname(__DIR__, 3) . '/storage/addons');
            }
            if (!is_dir(APP_ADDONS_DIR) && !@mkdir(APP_ADDONS_DIR, 0755, true)) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to prepare addons directory', 'ADDONS_DIR_CREATE_FAILED', 500);
            }

            $configFile = rtrim($tempDir, '/') . '/conf.yml';
            if (!file_exists($configFile)) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Invalid addon: missing conf.yml', 'ADDON_INVALID', 422);
            }

            if ($identifier === null) {
                try {
                    $conf = \Symfony\Component\Yaml\Yaml::parseFile($configFile);
                    $identifier = $conf['plugin']['identifier'] ?? null;
                } catch (\Throwable $t) {
                    @exec('rm -rf ' . escapeshellarg($tempDir));

                    return ApiResponse::error('Failed to parse conf.yml', 'ADDON_CONF_PARSE_FAILED', 422);
                }
            }

            if (!$identifier || !preg_match('/^[a-z0-9_\-]+$/', (string) $identifier)) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Invalid addon identifier in conf.yml', 'ADDON_IDENTIFIER_INVALID', 422);
            }

            $entryValidation = \App\Plugins\PluginEntryValidator::validatePackage($tempDir, $identifier);
            if (!$entryValidation['valid']) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error(
                    $entryValidation['errors'][0] ?? 'Invalid addon entry class configuration',
                    'ADDON_ENTRY_INVALID',
                    422,
                    ['errors' => $entryValidation['errors']]
                );
            }

            $pluginDir = APP_ADDONS_DIR . '/' . $identifier;
            $isUpdate = file_exists($pluginDir);
            $oldVersion = null;

            // If updating, backup settings and get old version
            if ($isUpdate) {
                try {
                    $oldConfig = \App\Plugins\PluginConfig::getConfig($identifier);
                    $oldVersion = $oldConfig['plugin']['version'] ?? null;

                    // Backup settings before update
                    $settingsBackup = \App\Plugins\PluginSettings::getSettings($identifier);
                } catch (\Exception $e) {
                    // Failed to backup, continue anyway
                    $settingsBackup = [];
                }

                // Remove old plugin directory
                @exec('rm -rf ' . escapeshellarg($pluginDir));
            }

            if (!@mkdir($pluginDir, 0755, true)) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to create addon directory', 'ADDON_DIR_FAILED', 500);
            }

            $copyCmd = sprintf('cp -r %s/* %s', escapeshellarg($tempDir), escapeshellarg($pluginDir));
            exec($copyCmd);
            @exec('rm -rf ' . escapeshellarg($tempDir));

            // Expose public assets at public/addons/{identifier} using ln -s (fallback to copy)
            $pluginPublic = $pluginDir . '/Public';
            $publicAddonsBase = dirname(__DIR__, 3) . '/public/addons';
            if (is_dir($pluginPublic)) {
                if (!is_dir($publicAddonsBase)) {
                    @mkdir($publicAddonsBase, 0755, true);
                }
                $linkPath = $publicAddonsBase . '/' . $identifier;
                @exec('rm -rf ' . escapeshellarg($linkPath));
                $lnCmd = 'ln -s ' . escapeshellarg($pluginPublic) . ' ' . escapeshellarg($linkPath);
                exec($lnCmd, $lnOut, $lnCode);
                if ($lnCode !== 0) {
                    @mkdir($linkPath, 0755, true);
                    $copyPubCmd = sprintf('cp -r %s/* %s', escapeshellarg($pluginPublic), escapeshellarg($linkPath));
                    exec($copyPubCmd);
                }
            }

            // Expose Frontend/Components at public/components/{identifier} using ln -s (fallback to copy)
            $pluginComponents = $pluginDir . '/Frontend/Components';
            if (is_dir($pluginComponents)) {
                $publicComponentsBase = dirname(__DIR__, 3) . '/public/components';

                // Create /public/components directory if it doesn't exist
                if (!is_dir($publicComponentsBase)) {
                    @mkdir($publicComponentsBase, 0755, true);
                }

                // Create symlink at /public/components/{identifier}
                $linkPath = $publicComponentsBase . '/' . $identifier;
                @exec('rm -rf ' . escapeshellarg($linkPath));
                $lnCmd = 'ln -s ' . escapeshellarg($pluginComponents) . ' ' . escapeshellarg($linkPath);
                exec($lnCmd, $lnOut, $lnCode);

                // Fallback to copy if symlink fails
                if ($lnCode !== 0) {
                    @mkdir($linkPath, 0755, true);
                    $copyCmd = sprintf('cp -r %s/* %s', escapeshellarg($pluginComponents), escapeshellarg($linkPath));
                    exec($copyCmd);
                }
            }

            // Run migrations
            $migrationResult = $this->runAddonMigrations($identifier, $pluginDir);
            if ($migrationResult['failed'] > 0) {
                return ApiResponse::error('Addon migrations failed', 'ADDON_MIGRATION_FAILED', 422, [
                    'output' => implode("\n", $migrationResult['lines'] ?? []),
                ]);
            }

            // Restore settings if this was an update
            if ($isUpdate && !empty($settingsBackup)) {
                try {
                    foreach ($settingsBackup as $setting) {
                        \App\Plugins\PluginSettings::setSetting($identifier, $setting['key'], $setting['value']);
                    }
                } catch (\Exception $e) {
                    // Log but don't fail - settings restore is best effort
                    App::getInstance(true)->getLogger()->warning('Failed to restore some settings during plugin update: ' . $e->getMessage());
                }
            }

            // Get new version and plugin name from config before calling hooks
            $newVersion = null;
            $pluginName = null;
            try {
                $newConfig = \App\Plugins\PluginConfig::getConfig($identifier);
                $newVersion = $newConfig['plugin']['version'] ?? null;
                $pluginName = $newConfig['plugin']['name'] ?? $identifier;
            } catch (\Exception $e) {
                // Failed to get version
                App::getInstance(true)->getLogger()->warning('Failed to get new version for plugin ' . $identifier . ': ' . $e->getMessage());
            }

            // Call plugin install/update hook if present
            $phpFiles = glob($pluginDir . '/*.php') ?: [];
            if (!empty($phpFiles)) {
                try {
                    require_once $phpFiles[0];
                    $className = basename($phpFiles[0], '.php');
                    $namespace = 'App\\Addons\\' . $identifier;
                    $full = $namespace . '\\' . $className;

                    if (class_exists($full)) {
                        // Check if class implements AppPlugin interface
                        $implementsInterface = in_array(\App\Plugins\AppPlugin::class, class_implements($full), true);

                        if ($isUpdate) {
                            // Try pluginUpdate hook (optional - not part of interface for backward compatibility)
                            if (method_exists($full, 'pluginUpdate')) {
                                try {
                                    App::getInstance(true)->getLogger()->info("Calling pluginUpdate hook for {$identifier} ({$oldVersion} -> {$newVersion})");

                                    // Check method signature using reflection
                                    $reflection = new \ReflectionMethod($full, 'pluginUpdate');
                                    $params = $reflection->getParameters();

                                    // Call with appropriate parameters based on method signature
                                    if (count($params) >= 2) {
                                        // New signature: pluginUpdate($oldVersion, $newVersion)
                                        $full::pluginUpdate($oldVersion, $newVersion);
                                    } else {
                                        // Old signature: pluginUpdate($oldVersion) - backward compatibility
                                        $full::pluginUpdate($oldVersion);
                                    }

                                    App::getInstance(true)->getLogger()->info("pluginUpdate hook completed successfully for {$identifier}");
                                } catch (\Throwable $e) {
                                    // Log error but don't fail the update - hooks are optional
                                    App::getInstance(true)->getLogger()->error("pluginUpdate hook failed for {$identifier}: " . $e->getMessage());
                                    App::getInstance(true)->getLogger()->error('Stack trace: ' . $e->getTraceAsString());
                                }
                            } elseif (method_exists($full, 'pluginInstall')) {
                                // Fallback to pluginInstall if pluginUpdate doesn't exist
                                App::getInstance(true)->getLogger()->info("Calling pluginInstall hook (fallback) for update of {$identifier}");
                                try {
                                    $full::pluginInstall();
                                } catch (\Throwable $e) {
                                    App::getInstance(true)->getLogger()->error("pluginInstall hook (fallback) failed for {$identifier}: " . $e->getMessage());
                                }
                            }
                        } else {
                            // Fresh install - call pluginInstall hook
                            if ($implementsInterface || method_exists($full, 'pluginInstall')) {
                                try {
                                    App::getInstance(true)->getLogger()->info("Calling pluginInstall hook for {$identifier}");
                                    $full::pluginInstall();
                                    App::getInstance(true)->getLogger()->info("pluginInstall hook completed successfully for {$identifier}");
                                } catch (\Throwable $e) {
                                    // Log error but don't fail the install - hooks are optional
                                    App::getInstance(true)->getLogger()->error("pluginInstall hook failed for {$identifier}: " . $e->getMessage());
                                    App::getInstance(true)->getLogger()->error('Stack trace: ' . $e->getTraceAsString());
                                }
                            }
                        }
                    }
                } catch (\Throwable $e) {
                    // Log error but don't fail installation - hooks are optional
                    App::getInstance(true)->getLogger()->error("Failed to load plugin class for {$identifier}: " . $e->getMessage());
                }
            }

            // Track installation in database
            try {
                $existing = InstalledPlugin::getInstalledPluginByIdentifier($identifier);
                if ($existing) {
                    // Update existing record (reinstall or update)
                    InstalledPlugin::updateInstalledPlugin($identifier, [
                        'name' => $pluginName ?? $identifier,
                        'version' => $newVersion,
                        'cloud_id' => $cloudId,
                    ]);
                    // Clear uninstalled_at if it was set
                    InstalledPlugin::markAsReinstalled($identifier);
                } else {
                    // Create new record
                    InstalledPlugin::createInstalledPlugin([
                        'name' => $pluginName ?? $identifier,
                        'identifier' => $identifier,
                        'version' => $newVersion,
                        'cloud_id' => $cloudId,
                    ]);
                }
            } catch (\Exception $e) {
                // Log but don't fail installation
                App::getInstance(true)->getLogger()->warning('Failed to track plugin installation: ' . $e->getMessage());
            }

            if ($isUpdate) {
                App::getInstance(true)->getLogger()->info("Addon updated successfully: {$identifier} ({$oldVersion} -> {$newVersion})");

                return ApiResponse::success([
                    'identifier' => $identifier,
                    'is_update' => true,
                    'old_version' => $oldVersion,
                    'new_version' => $newVersion,
                ], 'Addon updated successfully', 200);
            }

            App::getInstance(true)->getLogger()->info('Addon installed successfully: ' . $identifier);

            return ApiResponse::success([
                'identifier' => $identifier,
                'is_update' => false,
                'version' => $newVersion,
            ], 'Addon installed successfully', 201);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to finalize addon install: ' . $e->getMessage());
            @exec('rm -rf ' . escapeshellarg($tempDir));

            return ApiResponse::error('Failed to finalize addon install: ' . $e->getMessage(), 500);
        }
    }

    public static function getInstance(): self
    {
        if (!isset(self::$instance)) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    /**
     * @return list<string>
     */
    private function normalizeQueuedPluginIdentifiers(mixed $raw): array
    {
        if (!is_array($raw)) {
            return [];
        }
        $unique = [];
        foreach ($raw as $id) {
            if (!is_string($id)) {
                continue;
            }
            if (!preg_match('/^[a-zA-Z0-9_\-]+$/', $id)) {
                continue;
            }
            $unique[$id] = true;
        }

        return array_keys($unique);
    }

    /**
     * @return list<string>
     */
    private function parsePendingPluginsQuery(Request $request): array
    {
        $raw = $request->query->get('pending_plugins');
        if (is_array($raw)) {
            return $this->normalizeQueuedPluginIdentifiers($raw);
        }
        if (is_string($raw) && $raw !== '') {
            $parts = array_map('trim', explode(',', $raw));

            return $this->normalizeQueuedPluginIdentifiers($parts);
        }

        return [];
    }

    /**
     * Download a Mythic product release and read conf.yml dependency lines.
     *
     * @return array{checks: list<array<string, mixed>>, all_met: bool, missing: list<string>}
     */
    private function evaluateConfDependencyChecksForProduct(FeatherCloudClient $client, string $slug, string $version): array
    {
        try {
            $fileContent = $client->downloadProductRelease($slug, $version);

            return $this->evaluateConfDependencyChecksFromBinary($fileContent);
        } catch (FeatherCloudException $e) {
            App::getInstance(true)->getLogger()->warning(
                'Mythic dependency check download failed for ' . $slug . '@' . $version . ': ' . $e->getMessage()
            );

            return ['checks' => [], 'all_met' => true, 'missing' => []];
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->warning(
                'Mythic dependency check failed for ' . $slug . '@' . $version . ': ' . $e->getMessage()
            );

            return ['checks' => [], 'all_met' => true, 'missing' => []];
        }
    }

    /**
     * @return array{checks: list<array<string, mixed>>, all_met: bool, missing: list<string>}
     */
    private function evaluateConfDependencyChecksFromBinary(string $fileContent): array
    {
        $dependencyChecks = [];
        $missingDependencies = [];
        $allDependenciesMet = true;

        if ($fileContent === '') {
            return ['checks' => [], 'all_met' => true, 'missing' => []];
        }

        $tempFile = sys_get_temp_dir() . '/' . uniqid('featherpanel_check_', true) . '.fpa';
        file_put_contents($tempFile, $fileContent);

        $tempDir = sys_get_temp_dir() . '/' . uniqid('featherpanel_check_', true);
        $extracted = AddonPackageHelper::extract($tempFile, $tempDir, self::PASSWORD, ['conf.yml']);

        if ($extracted && file_exists($tempDir . '/conf.yml')) {
            try {
                $conf = \Symfony\Component\Yaml\Yaml::parseFile($tempDir . '/conf.yml');
                $confDependencies = $conf['plugin']['dependencies'] ?? [];
                if (!is_array($confDependencies)) {
                    $confDependencies = [];
                }

                foreach ($confDependencies as $dep) {
                    if (!is_string($dep)) {
                        continue;
                    }
                    $met = false;
                    $message = '';
                    $type = 'unknown';
                    $name = $dep;

                    if (strpos($dep, 'composer=') === 0) {
                        $composerPkg = substr($dep, strlen('composer='));
                        $met = \App\Plugins\Dependencies\ComposerDependencies::isInstalled($composerPkg);
                        $message = $met ? 'Composer package installed' : "Composer package required: {$composerPkg}";
                        $type = 'composer';
                        $name = $composerPkg;
                    } elseif (strpos($dep, 'plugin=') === 0) {
                        $pluginDep = substr($dep, strlen('plugin='));
                        $met = \App\Plugins\Dependencies\AppDependencies::isInstalled($pluginDep);
                        $message = $met ? 'Plugin installed' : "Plugin required: {$pluginDep}";
                        $type = 'plugin';
                        $name = $pluginDep;
                    } elseif (strpos($dep, 'php=') === 0) {
                        $phpVersion = substr($dep, strlen('php='));
                        $met = \App\Plugins\Dependencies\PhpVersionDependencies::isInstalled($phpVersion);
                        $message = $met ? 'PHP version requirement met' : "PHP version required: {$phpVersion}";
                        $type = 'php';
                        $name = $phpVersion;
                    } elseif (strpos($dep, 'php-ext=') === 0) {
                        $ext = substr($dep, strlen('php-ext='));
                        $met = \App\Plugins\Dependencies\PhpExtensionDependencies::isInstalled($ext);
                        $message = $met ? 'PHP extension installed' : "PHP extension required: {$ext}";
                        $type = 'php-ext';
                        $name = $ext;
                    } else {
                        $met = true;
                        $message = "Unknown dependency format: {$dep}";
                    }

                    $dependencyChecks[] = [
                        'dependency' => $dep,
                        'type' => $type,
                        'name' => $name,
                        'met' => $met,
                        'message' => $message,
                    ];

                    if (!$met) {
                        $missingDependencies[] = $dep;
                        $allDependenciesMet = false;
                    }
                }
            } catch (\Exception $e) {
                App::getInstance(true)->getLogger()->warning('Failed to parse conf.yml for dependency check: ' . $e->getMessage());
            }
        }

        @exec('rm -rf ' . escapeshellarg($tempDir));
        @unlink($tempFile);

        return [
            'checks' => $dependencyChecks,
            'all_met' => $allDependenciesMet,
            'missing' => $missingDependencies,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function listMythicAddons(FeatherCloudClient $client): array
    {
        $rows = $this->fetchAllPurchases($client);
        $bySlug = [];

        foreach ($rows as $row) {
            $product = $this->extractProductFromPurchaseRow($row);
            if ($product === null) {
                continue;
            }
            $slug = $this->productSlug($product);
            if ($slug === '' || isset($bySlug[$slug])) {
                continue;
            }

            try {
                $releasesPayload = $client->getProductReleases($slug);
            } catch (FeatherCloudException $e) {
                // Only list products this panel can actually download.
                if (in_array($e->getErrorCode(), ['PANEL_DOWNLOADS_DISABLED', 'ACCESS_DENIED', 'PRODUCT_NOT_FOUND', 'NO_RELEASES', 'NOT_FOUND'], true)) {
                    continue;
                }
                App::getInstance(true)->getLogger()->debug(
                    'Mythic releases unavailable for ' . $slug . ': ' . $e->getErrorCode()
                );
                continue;
            }

            $releases = $this->extractReleases($releasesPayload);
            if ($releases === []) {
                continue;
            }

            $productFromReleases = $this->extractProductFromReleasesPayload($releasesPayload);
            if ($productFromReleases !== null) {
                $product = array_merge($product, $productFromReleases);
            }

            $addon = self::normalizeMythicProductForResponse($product, $row);
            $addon['latest_version'] = self::normalizeReleaseAsLatest($releases[0]);
            $bySlug[$slug] = $addon;
        }

        return array_values($bySlug);
    }

    /**
     * @return array{addon: array<string, mixed>, product: array<string, mixed>, releases: list<array<string, mixed>>}|null
     */
    private function resolveMythicProduct(FeatherCloudClient $client, string $identifier): ?array
    {
        $product = null;
        foreach ($this->fetchAllPurchases($client) as $row) {
            $candidate = $this->extractProductFromPurchaseRow($row);
            if ($candidate === null) {
                continue;
            }
            if ($this->productMatchesIdentifier($candidate, $identifier)) {
                $product = $candidate;
                break;
            }
        }

        $lookupSlug = $product !== null ? $this->productSlug($product) : '';
        if ($lookupSlug === '') {
            $lookupSlug = trim($identifier);
        }

        try {
            $releasesPayload = $client->getProductReleases($lookupSlug);
            $releases = $this->extractReleases($releasesPayload);
        } catch (FeatherCloudException $e) {
            if (
                in_array($e->getErrorCode(), ['PRODUCT_NOT_FOUND', 'NOT_FOUND', 'PANEL_DOWNLOADS_DISABLED', 'ACCESS_DENIED', 'NO_RELEASES'], true)
                || $e->getHttpStatusCode() === 404
                || $e->getHttpStatusCode() === 403
            ) {
                return null;
            }
            throw $e;
        }

        if ($releases === []) {
            return null;
        }

        $productFromReleases = $this->extractProductFromReleasesPayload($releasesPayload);
        if ($productFromReleases !== null) {
            $product = is_array($product) ? array_merge($product, $productFromReleases) : $productFromReleases;
        }

        if ($product === null) {
            $product = [
                'id' => null,
                'identifier' => $identifier,
                'slug' => $lookupSlug,
                'name' => $identifier,
                'display_name' => $identifier,
            ];
        }

        $addon = self::normalizeMythicProductForResponse($product);
        $addon['latest_version'] = self::normalizeReleaseAsLatest($releases[0]);

        return [
            'addon' => $addon,
            'product' => $product,
            'releases' => $releases,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     *
     * @return array<string, mixed>|null
     */
    private function extractProductFromReleasesPayload(array $payload): ?array
    {
        if (isset($payload['product']) && is_array($payload['product'])) {
            return $payload['product'];
        }
        if (isset($payload['data']['product']) && is_array($payload['data']['product'])) {
            return $payload['data']['product'];
        }

        return null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function fetchAllPurchases(FeatherCloudClient $client): array
    {
        $all = [];
        $page = 1;
        $limit = 100;

        do {
            $payload = $client->getPurchasedProducts($page, $limit);
            $batch = $this->extractPurchaseRows($payload);
            foreach ($batch as $row) {
                $all[] = $row;
            }
            $count = count($batch);
            ++$page;
        } while ($count >= $limit && $page <= 20);

        return $all;
    }

    /**
     * @param array<string, mixed> $payload
     *
     * @return list<array<string, mixed>>
     */
    private function extractPurchaseRows(array $payload): array
    {
        if (isset($payload['purchases']) && is_array($payload['purchases'])) {
            return array_values(array_filter($payload['purchases'], 'is_array'));
        }
        if (isset($payload['items']) && is_array($payload['items'])) {
            return array_values(array_filter($payload['items'], 'is_array'));
        }
        if (isset($payload['products']) && is_array($payload['products'])) {
            return array_values(array_filter($payload['products'], 'is_array'));
        }
        if (isset($payload['data']) && is_array($payload['data'])) {
            if (array_is_list($payload['data'])) {
                return array_values(array_filter($payload['data'], 'is_array'));
            }
            foreach (['purchases', 'items', 'products'] as $key) {
                if (isset($payload['data'][$key]) && is_array($payload['data'][$key])) {
                    return array_values(array_filter($payload['data'][$key], 'is_array'));
                }
            }
        }
        if (array_is_list($payload)) {
            return array_values(array_filter($payload, 'is_array'));
        }

        return [];
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>|null
     */
    private function extractProductFromPurchaseRow(array $row): ?array
    {
        if (isset($row['product']) && is_array($row['product'])) {
            return $row['product'];
        }
        if (isset($row['identifier']) || isset($row['name']) || isset($row['slug'])) {
            return $row;
        }

        return null;
    }

    /**
     * Marketplace product slug used for Mythic download/release API paths.
     *
     * @param array<string, mixed> $product
     */
    private function productSlug(array $product): string
    {
        foreach (['slug', 'store_slug'] as $key) {
            if (isset($product[$key]) && is_string($product[$key]) && trim($product[$key]) !== '') {
                return trim($product[$key]);
            }
        }

        // Legacy payloads may only expose a single identifier field.
        foreach (['identifier', 'name'] as $key) {
            if (isset($product[$key]) && is_string($product[$key]) && trim($product[$key]) !== '') {
                return trim($product[$key]);
            }
        }

        return '';
    }

    /**
     * Local FeatherPanel plugin identifier (conf.yml / addons folder).
     *
     * @param array<string, mixed> $product
     */
    private function pluginIdentifier(array $product): string
    {
        foreach (['featherpanel_plugin_identifier', 'identifier'] as $key) {
            if (isset($product[$key]) && is_string($product[$key]) && trim($product[$key]) !== '') {
                return trim($product[$key]);
            }
        }

        return $this->productSlug($product);
    }

    /**
     * Whether a purchase/product row matches a requested plugin id or store slug.
     *
     * @param array<string, mixed> $product
     */
    private function productMatchesIdentifier(array $product, string $identifier): bool
    {
        $needle = strtolower(trim($identifier));
        if ($needle === '') {
            return false;
        }

        foreach ([$this->pluginIdentifier($product), $this->productSlug($product)] as $candidate) {
            if ($candidate !== '' && strtolower($candidate) === $needle) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param array<string, mixed> $payload
     *
     * @return list<array<string, mixed>>
     */
    private function extractReleases(array $payload): array
    {
        $list = [];
        if (isset($payload['releases']) && is_array($payload['releases'])) {
            $list = $payload['releases'];
        } elseif (isset($payload['data']) && is_array($payload['data'])) {
            if (isset($payload['data']['releases']) && is_array($payload['data']['releases'])) {
                $list = $payload['data']['releases'];
            } elseif (array_is_list($payload['data'])) {
                $list = $payload['data'];
            }
        } elseif (array_is_list($payload)) {
            $list = $payload;
        }

        $releases = array_values(array_filter($list, 'is_array'));
        usort($releases, static function (array $a, array $b): int {
            $va = ltrim((string) ($a['version'] ?? ''), 'vV');
            $vb = ltrim((string) ($b['version'] ?? ''), 'vV');
            if ($va !== '' && $vb !== '' && version_compare($va, $vb, '!=')) {
                return version_compare($vb, $va);
            }

            return strcmp((string) ($b['created_at'] ?? ''), (string) ($a['created_at'] ?? ''));
        });

        return $releases;
    }

    /**
     * @param list<array<string, mixed>> $addons
     * @param list<string> $tags
     *
     * @return list<array<string, mixed>>
     */
    private function filterMythicAddons(array $addons, string $q, bool $verifiedOnly, array $tags): array
    {
        $qLower = mb_strtolower($q);
        $tagSet = array_values(array_filter(array_map(static fn (string $t): string => mb_strtolower(trim($t)), $tags), static fn (string $t): bool => $t !== ''));

        return array_values(array_filter($addons, static function (array $addon) use ($qLower, $verifiedOnly, $tagSet): bool {
            if ($verifiedOnly && empty($addon['verified'])) {
                return false;
            }
            if ($tagSet !== []) {
                $addonTags = array_map(static fn ($t): string => mb_strtolower((string) $t), is_array($addon['tags'] ?? null) ? $addon['tags'] : []);
                foreach ($tagSet as $tag) {
                    if (!in_array($tag, $addonTags, true)) {
                        return false;
                    }
                }
            }
            if ($qLower === '') {
                return true;
            }
            $haystack = mb_strtolower(implode(' ', [
                (string) ($addon['identifier'] ?? ''),
                (string) ($addon['name'] ?? ''),
                (string) ($addon['description'] ?? ''),
                (string) ($addon['author'] ?? ''),
            ]));

            return str_contains($haystack, $qLower);
        }));
    }

    /**
     * @param list<array<string, mixed>> $addons
     *
     * @return list<array<string, mixed>>
     */
    private function sortMythicAddons(array $addons, string $sortBy, string $sortOrder): array
    {
        $field = in_array($sortBy, ['created_at', 'downloads', 'updated_at'], true) ? $sortBy : 'created_at';
        $desc = strtoupper($sortOrder) !== 'ASC';

        usort($addons, static function (array $a, array $b) use ($field, $desc): int {
            $av = $a[$field] ?? null;
            $bv = $b[$field] ?? null;
            if ($field === 'downloads') {
                $cmp = ((int) $av) <=> ((int) $bv);
            } else {
                $cmp = strcmp((string) $av, (string) $bv);
            }

            return $desc ? -$cmp : $cmp;
        });

        return $addons;
    }

    /**
     * Map a Mythic product to the panel online-addon shape.
     *
     * @param array<string, mixed> $product
     * @param array<string, mixed>|null $purchaseRow
     *
     * @return array<string, mixed>
     */
    private static function normalizeMythicProductForResponse(array $product, ?array $purchaseRow = null): array
    {
        $storeSlug = '';
        foreach (['slug', 'store_slug'] as $key) {
            if (isset($product[$key]) && is_string($product[$key]) && trim($product[$key]) !== '') {
                $storeSlug = trim($product[$key]);
                break;
            }
        }

        $pluginId = '';
        foreach (['featherpanel_plugin_identifier', 'identifier'] as $key) {
            if (isset($product[$key]) && is_string($product[$key]) && trim($product[$key]) !== '') {
                $pluginId = trim($product[$key]);
                break;
            }
        }
        if ($pluginId === '') {
            $pluginId = $storeSlug;
        }
        if ($storeSlug === '') {
            $storeSlug = $pluginId;
        }
        if ($storeSlug === '' && isset($product['name']) && is_string($product['name'])) {
            $storeSlug = trim($product['name']);
            if ($pluginId === '') {
                $pluginId = $storeSlug;
            }
        }

        $price = $product['price'] ?? ($product['premium_price'] ?? null);
        $isPremium = 0;
        if (isset($product['premium'])) {
            $isPremium = (int) $product['premium'] ? 1 : 0;
        } elseif (is_numeric($price) && (float) $price > 0) {
            $isPremium = 1;
        }

        $premiumLink = null;
        if (isset($product['premium_link']) && is_string($product['premium_link'])) {
            $premiumLink = $product['premium_link'];
        } elseif (isset($product['url']) && is_string($product['url'])) {
            $premiumLink = $product['url'];
        } elseif ($storeSlug !== '') {
            $premiumLink = 'https://my.mythicalsystems.org/market/' . rawurlencode($storeSlug);
        }

        $iconUrl = $product['icon_url'] ?? ($product['icon'] ?? ($product['image'] ?? null));

        return [
            'id' => $product['id'] ?? null,
            'identifier' => $pluginId,
            'featherpanel_plugin_identifier' => isset($product['featherpanel_plugin_identifier'])
                && is_string($product['featherpanel_plugin_identifier'])
                && trim($product['featherpanel_plugin_identifier']) !== ''
                    ? trim($product['featherpanel_plugin_identifier'])
                    : null,
            'store_slug' => $storeSlug !== '' ? $storeSlug : self::extractStoreSlugFromPremiumLink($premiumLink),
            'name' => $product['display_name'] ?? ($product['name'] ?? $pluginId),
            'description' => $product['description'] ?? null,
            'icon' => PanelAssetUrl::rewriteCloudStorageIcon(is_string($iconUrl) ? $iconUrl : null),
            'website' => $product['website'] ?? null,
            'author' => $product['author'] ?? ($purchaseRow['username'] ?? null),
            'author_email' => $product['author_email'] ?? ($purchaseRow['email'] ?? null),
            'maintainers' => $product['maintainers'] ?? [],
            'tags' => $product['tags'] ?? [],
            'verified' => isset($product['verified']) ? ((int) $product['verified'] === 1 || $product['verified'] === true) : false,
            'premium' => $isPremium,
            'premium_link' => $premiumLink,
            'premium_price' => $price,
            'downloads' => $product['downloads'] ?? 0,
            'created_at' => $product['created_at'] ?? ($purchaseRow['purchased_at'] ?? null),
            'updated_at' => $product['updated_at'] ?? null,
            'latest_version' => null,
        ];
    }

    /**
     * @param array<string, mixed> $release
     *
     * @return array<string, mixed>
     */
    private static function normalizeReleaseAsLatest(array $release): array
    {
        return [
            'version' => $release['version'] ?? null,
            'download_url' => null,
            'file_size' => $release['file_size'] ?? ($release['size'] ?? null),
            'created_at' => $release['created_at'] ?? null,
            'changelog' => $release['changelog'] ?? null,
            'dependencies' => $release['dependencies'] ?? [],
            'min_panel_version' => $release['min_panel_version'] ?? null,
            'max_panel_version' => $release['max_panel_version'] ?? null,
        ];
    }

    /**
     * @param array<string, mixed> $release
     *
     * @return array<string, mixed>
     */
    private static function normalizeReleaseAsVersion(array $release): array
    {
        return [
            'id' => $release['id'] ?? null,
            'version' => $release['version'] ?? null,
            'download_url' => null,
            'file_size' => $release['file_size'] ?? ($release['size'] ?? null),
            'file_hash' => $release['file_hash'] ?? ($release['hash'] ?? null),
            'changelog' => $release['changelog'] ?? null,
            'dependencies' => $release['dependencies'] ?? [],
            'min_panel_version' => $release['min_panel_version'] ?? null,
            'max_panel_version' => $release['max_panel_version'] ?? null,
            'downloads' => $release['downloads'] ?? 0,
            'created_at' => $release['created_at'] ?? null,
            'updated_at' => $release['updated_at'] ?? null,
            'title' => $release['title'] ?? null,
            'file_name' => $release['file_name'] ?? null,
        ];
    }

    /**
     * @param array<string, mixed>|null $extra
     */
    private function credentialsRequiredResponse(?array $extra = null): Response
    {
        return ApiResponse::error(
            'Mythic Cloud credentials are not configured. Link your panel in Cloud Management to browse and download marketplace products.',
            'CLOUD_CREDENTIALS_NOT_CONFIGURED',
            503,
            $extra
        );
    }

    private function mythicErrorResponse(FeatherCloudException $e): Response
    {
        $status = $e->getHttpStatusCode();
        $code = $e->getErrorCode();
        $message = $e->getMessage();

        if ($status === 401) {
            $status = 503;
        }

        $message = match ($code) {
            'PANEL_DOWNLOADS_DISABLED' => 'This product does not allow MythicalCloud panel downloads.',
            'ACCESS_DENIED' => 'Access denied for this Mythic marketplace action.',
            'INVALID_USER_UUID' => 'Your panel user is not mapped to a Mythic team member. Re-link Cloud Connections with a matching email.',
            'MEMBER_UUID_REQUIRED' => 'Your panel user is not mapped to a Mythic team member. Re-link Cloud Connections with a matching email.',
            'CREDENTIALS_NOT_CONFIGURED' => 'Mythic Cloud credentials are not configured. Link your panel in Cloud Management.',
            default => $message,
        };

        return ApiResponse::error($message, $code, $status);
    }

    /**
     * Marketplace slug from the premium purchase URL (last path segment).
     */
    private static function extractStoreSlugFromPremiumLink(?string $link): ?string
    {
        if ($link === null || trim($link) === '') {
            return null;
        }

        $path = parse_url($link, PHP_URL_PATH);
        if (!is_string($path) || $path === '') {
            return null;
        }

        $segments = array_values(array_filter(explode('/', $path), static fn (string $s): bool => $s !== ''));

        return $segments !== [] ? (string) end($segments) : null;
    }

    /**
     * Execute addon-provided SQL migrations from the addon's Migrations directory.
     * Each script will be recorded in featherpanel_migrations with a unique key
     * in the form addon:{identifier}:{filename} to avoid collisions.
     *
     * @return array{executed:int,skipped:int,failed:int,lines:string[]}
     */
    private function runAddonMigrations(string $identifier, string $pluginDir): array
    {
        $lines = [];
        $executed = 0;
        $skipped = 0;
        $failed = 0;

        try {
            $dir = rtrim($pluginDir, '/') . '/Migrations';
            if (!is_dir($dir)) {
                $lines[] = 'No migrations directory for addon: ' . $identifier;

                return compact('executed', 'skipped', 'failed', 'lines');
            }

            // Connect to database using env loaded by kernel
            $db = new Database(
                $_ENV['DATABASE_HOST'] ?? '127.0.0.1',
                $_ENV['DATABASE_DATABASE'] ?? '',
                $_ENV['DATABASE_USER'] ?? '',
                $_ENV['DATABASE_PASSWORD'] ?? '',
                (int) ($_ENV['DATABASE_PORT'] ?? 3306)
            );
            $pdo = $db->getPdo();

            // Ensure migrations table exists
            $migrationsSql = "CREATE TABLE IF NOT EXISTS `featherpanel_migrations` (
				`id` INT NOT NULL AUTO_INCREMENT COMMENT 'The id of the migration!',
				`script` TEXT NOT NULL COMMENT 'The script to be migrated!',
				`migrated` ENUM('true','false') NOT NULL DEFAULT 'true' COMMENT 'Did we migrate this already?',
				`date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'The date from when this was executed!',
				PRIMARY KEY (`id`)
			) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT = 'The migrations table is table where save the sql migrations!';";
            $pdo->exec($migrationsSql);

            $files = scandir($dir) ?: [];
            $migrationFiles = array_values(array_filter($files, static function ($file) use ($dir) {
                return $file !== '.' && $file !== '..' && pathinfo($file, PATHINFO_EXTENSION) === 'sql' && is_file($dir . '/' . $file);
            }));

            foreach ($migrationFiles as $file) {
                $path = $dir . '/' . $file;
                $sql = @file_get_contents($path);
                $scriptKey = 'addon:' . $identifier . ':' . $file;
                if ($sql === false) {
                    $lines[] = '⏭️  Skipped (unreadable): ' . $file;
                    ++$skipped;
                    continue;
                }
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM featherpanel_migrations WHERE script = :script AND migrated = 'true'");
                $stmt->execute(['script' => $scriptKey]);
                if ((int) $stmt->fetchColumn() > 0) {
                    $lines[] = '⏭️  Skipped (already executed): ' . $file;
                    ++$skipped;
                    continue;
                }
                try {
                    $pdo->exec($sql);
                    $ins = $pdo->prepare('INSERT INTO featherpanel_migrations (script, migrated) VALUES (:script, :migrated)');
                    $ins->execute(['script' => $scriptKey, 'migrated' => 'true']);
                    $lines[] = '✅ Executed: ' . $file;
                    ++$executed;
                } catch (\Exception $ex) {
                    $lines[] = '❌ Failed: ' . $file . ' -> ' . $ex->getMessage();
                    ++$failed;
                }
            }
        } catch (\Exception $e) {
            $lines[] = '❌ Migration error: ' . $e->getMessage();
            ++$failed;
        }

        return compact('executed', 'skipped', 'failed', 'lines');
    }
}
