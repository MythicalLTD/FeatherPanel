<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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

namespace App\Controllers\Admin;

use App\App;
use App\Chat\Activity;
use App\Chat\Database;
use App\Helpers\ApiResponse;
use App\Chat\InstalledPlugin;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\CloudPluginsEvent;

#[OA\Schema(
    schema: 'OnlineAddon',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Addon ID'),
        new OA\Property(property: 'identifier', type: 'string', description: 'Addon identifier'),
        new OA\Property(property: 'name', type: 'string', description: 'Addon display name'),
        new OA\Property(property: 'description', type: 'string', description: 'Addon description'),
        new OA\Property(property: 'icon', type: 'string', description: 'Addon icon URL'),
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
        new OA\Property(property: 'latest_version', type: 'object', properties: [
            new OA\Property(property: 'version', type: 'string', description: 'Latest version number'),
            new OA\Property(property: 'download_url', type: 'string', description: 'Download URL'),
            new OA\Property(property: 'file_size', type: 'integer', description: 'File size in bytes'),
            new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Version creation timestamp'),
        ]),
    ]
)]
#[OA\Schema(
    schema: 'OnlineInstall',
    type: 'object',
    required: ['identifier'],
    properties: [
        new OA\Property(property: 'identifier', type: 'string', description: 'Addon identifier to install', pattern: '^[a-zA-Z0-9_\\-]+$'),
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
        description: 'Retrieve a paginated list of available addons from the FeatherPanel packages API with search functionality.',
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
            // New official packages API
            $base = 'https://api.featherpanel.com/packages';
            $q = trim((string) ($request->query->get('q') ?? ''));
            $page = (int) ($request->query->get('page') ?? 1);
            $perPage = (int) ($request->query->get('per_page') ?? 20);
            $verifiedOnly = $request->query->get('verified_only') === 'true' || $request->query->get('verified_only') === '1';
            $tags = trim((string) ($request->query->get('tags') ?? ''));
            $sortBy = trim((string) ($request->query->get('sort_by') ?? 'created_at'));
            $sortOrder = strtoupper(trim((string) ($request->query->get('sort_order') ?? 'DESC')));

            $query = [];
            if ($q !== '') {
                $query['search'] = $q;
            }
            if ($page > 0) {
                $query['page'] = (string) $page;
            }
            if ($perPage > 0) {
                $query['per_page'] = (string) $perPage;
            }
            if ($verifiedOnly) {
                $query['verified_only'] = 'true';
            }
            if ($tags !== '') {
                $query['tags'] = $tags;
            }
            if (in_array($sortBy, ['created_at', 'downloads', 'updated_at'], true)) {
                $query['sort_by'] = $sortBy;
            }
            if (in_array($sortOrder, ['ASC', 'DESC'], true)) {
                $query['sort_order'] = $sortOrder;
            }
            $url = $base . (!empty($query) ? ('?' . http_build_query($query)) : '');
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'ignore_errors' => true,
                ],
            ]);
            $response = @file_get_contents($url, false, $context);
            if ($response === false) {
                return ApiResponse::error('Failed to fetch online addon list', 'ONLINE_LIST_FETCH_FAILED', 500);
            }

            $data = json_decode($response, true);
            if (!is_array($data) || !isset($data['data']['packages']) || !is_array($data['data']['packages'])) {
                return ApiResponse::error('Invalid response from online addon list', 'ONLINE_LIST_INVALID', 500);
            }

            $packages = $data['data']['packages'];
            $addons = array_map(static function (array $pkg): array {
                $latest = $pkg['latest_version'] ?? [];
                $downloadUrl = isset($latest['download_url']) ? ('https://api.featherpanel.com' . $latest['download_url']) : null;

                $iconUrl = $pkg['icon_url'];
                // If iconUrl is set and not empty, ensure it is https
                if (!empty($iconUrl) && is_string($iconUrl)) {
                    if (strpos($iconUrl, 'http://') === 0) {
                        $iconUrl = 'https://' . substr($iconUrl, 7);
                    }
                }

                return [
                    // Basic identity
                    'id' => $pkg['id'] ?? null,
                    'identifier' => $pkg['name'] ?? '',
                    'name' => $pkg['display_name'] ?? ($pkg['name'] ?? ''),
                    'description' => $pkg['description'] ?? null,
                    'icon' => $iconUrl,
                    'website' => $pkg['website'] ?? null,
                    // Authors/maintainers
                    'author' => $pkg['author'] ?? null,
                    'author_email' => $pkg['author_email'] ?? null,
                    'maintainers' => $pkg['maintainers'] ?? [],
                    // Meta
                    'tags' => $pkg['tags'] ?? [],
                    'verified' => isset($pkg['verified']) ? (int) $pkg['verified'] === 1 : false,
                    'premium' => isset($pkg['premium']) ? (int) $pkg['premium'] : 0,
                    'premium_link' => $pkg['premium_link'] ?? null,
                    'premium_price' => $pkg['premium_price'] ?? null,
                    'downloads' => $pkg['downloads'] ?? 0,
                    'created_at' => $pkg['created_at'] ?? null,
                    'updated_at' => $pkg['updated_at'] ?? null,
                    // Latest version
                    'latest_version' => [
                        'version' => $latest['version'] ?? null,
                        'download_url' => $downloadUrl,
                        'file_size' => $latest['file_size'] ?? null,
                        'created_at' => $latest['created_at'] ?? null,
                    ],
                ];
            }, $packages);

            $pagination = $data['data']['pagination'] ?? null;

            return ApiResponse::success([
                'addons' => $addons,
                'pagination' => $pagination,
            ], 'Online addons fetched', 200);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to fetch online addons: ' . $e->getMessage());

            return ApiResponse::error('Failed to fetch online addons: ' . $e->getMessage(), 500);
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
        description: 'Retrieve the most popular packages based on download count.',
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
            // Use the main packages endpoint with downloads sorting by default
            $base = 'https://api.featherpanel.com/packages';
            $limit = (int) ($request->query->get('limit') ?? 10);
            if ($limit < 1) {
                $limit = 10;
            }
            if ($limit > 50) {
                $limit = 50;
            }

            // Build query parameters - sort by downloads descending by default
            $query = [
                'page' => '1',
                'per_page' => (string) $limit,
                'sort_by' => 'downloads',
                'sort_order' => 'DESC',
            ];

            $url = $base . '?' . http_build_query($query);
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'ignore_errors' => true,
                ],
            ]);
            $response = @file_get_contents($url, false, $context);
            if ($response === false) {
                return ApiResponse::error('Failed to fetch popular packages', 'POPULAR_FETCH_FAILED', 500);
            }

            $data = json_decode($response, true);
            if (!is_array($data) || !isset($data['data']['packages']) || !is_array($data['data']['packages'])) {
                App::getInstance(true)->getLogger()->error('Invalid popular packages API response: ' . json_encode($data));

                return ApiResponse::error('Invalid response from popular packages API', 'POPULAR_INVALID', 500);
            }

            $packages = $data['data']['packages'];

            // Ensure packages are sorted by downloads (descending) in case API doesn't sort properly
            usort($packages, static function (array $a, array $b): int {
                $downloadsA = (int) ($a['downloads'] ?? 0);
                $downloadsB = (int) ($b['downloads'] ?? 0);

                return $downloadsB <=> $downloadsA; // Descending order
            });
            $addons = array_map(static function (array $pkg): array {
                $latest = $pkg['latest_version'] ?? [];
                $downloadUrl = isset($latest['download_url']) ? ('https://api.featherpanel.com' . $latest['download_url']) : null;

                $iconUrl = $pkg['icon_url'] ?? null;
                if (!empty($iconUrl) && is_string($iconUrl)) {
                    if (strpos($iconUrl, 'http://') === 0) {
                        $iconUrl = 'https://' . substr($iconUrl, 7);
                    }
                }

                return [
                    'id' => $pkg['id'] ?? null,
                    'identifier' => $pkg['name'] ?? '',
                    'name' => $pkg['display_name'] ?? ($pkg['name'] ?? ''),
                    'description' => $pkg['description'] ?? null,
                    'icon' => $iconUrl,
                    'website' => $pkg['website'] ?? null,
                    'author' => $pkg['author'] ?? null,
                    'author_email' => $pkg['author_email'] ?? null,
                    'maintainers' => $pkg['maintainers'] ?? [],
                    'tags' => $pkg['tags'] ?? [],
                    'verified' => isset($pkg['verified']) ? (int) $pkg['verified'] === 1 : false,
                    'premium' => isset($pkg['premium']) ? (int) $pkg['premium'] : 0,
                    'premium_link' => $pkg['premium_link'] ?? null,
                    'premium_price' => $pkg['premium_price'] ?? null,
                    'downloads' => $pkg['downloads'] ?? 0,
                    'created_at' => $pkg['created_at'] ?? null,
                    'updated_at' => $pkg['updated_at'] ?? null,
                    'latest_version' => [
                        'version' => $latest['version'] ?? null,
                        'download_url' => $downloadUrl,
                        'file_size' => $latest['file_size'] ?? null,
                        'created_at' => $latest['created_at'] ?? null,
                    ],
                ];
            }, $packages);

            return ApiResponse::success(['addons' => $addons], 'Popular packages fetched', 200);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to fetch popular packages: ' . $e->getMessage());

            return ApiResponse::error('Failed to fetch popular packages: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/plugins/online/{identifier}',
        summary: 'Get package details',
        description: 'Retrieve detailed information about a specific package, including all versions.',
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
            $base = 'https://api.featherpanel.com/packages/' . urlencode($identifier);
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'ignore_errors' => true,
                ],
            ]);
            $response = @file_get_contents($base, false, $context);
            if ($response === false) {
                return ApiResponse::error('Failed to fetch package details', 'PACKAGE_DETAILS_FETCH_FAILED', 500);
            }

            $data = json_decode($response, true);
            if (!is_array($data) || !isset($data['data']['package'])) {
                return ApiResponse::error('Package not found', 'PACKAGE_NOT_FOUND', 404);
            }

            $pkg = $data['data']['package'];
            $versions = $data['data']['versions'] ?? [];
            $latestVersion = $data['data']['latest_version'] ?? [];

            $iconUrl = $pkg['icon_url'] ?? null;
            if (!empty($iconUrl) && is_string($iconUrl)) {
                if (strpos($iconUrl, 'http://') === 0) {
                    $iconUrl = 'https://' . substr($iconUrl, 7);
                }
            }

            $package = [
                'id' => $pkg['id'] ?? null,
                'identifier' => $pkg['name'] ?? '',
                'name' => $pkg['display_name'] ?? ($pkg['name'] ?? ''),
                'description' => $pkg['description'] ?? null,
                'icon' => $iconUrl,
                'website' => $pkg['website'] ?? null,
                'author' => $pkg['author'] ?? null,
                'author_email' => $pkg['author_email'] ?? null,
                'maintainers' => $pkg['maintainers'] ?? [],
                'tags' => $pkg['tags'] ?? [],
                'verified' => isset($pkg['verified']) ? (int) $pkg['verified'] === 1 : false,
                'premium' => isset($pkg['premium']) ? (int) $pkg['premium'] : 0,
                'premium_link' => $pkg['premium_link'] ?? null,
                'premium_price' => $pkg['premium_price'] ?? null,
                'downloads' => $pkg['downloads'] ?? 0,
                'created_at' => $pkg['created_at'] ?? null,
                'updated_at' => $pkg['updated_at'] ?? null,
                'latest_version' => $latestVersion ? [
                    'version' => $latestVersion['version'] ?? null,
                    'download_url' => isset($latestVersion['download_url']) ? ('https://api.featherpanel.com' . $latestVersion['download_url']) : null,
                    'file_size' => $latestVersion['file_size'] ?? null,
                    'created_at' => $latestVersion['created_at'] ?? null,
                    'changelog' => $latestVersion['changelog'] ?? null,
                    'dependencies' => $latestVersion['dependencies'] ?? [],
                    'min_panel_version' => $latestVersion['min_panel_version'] ?? null,
                    'max_panel_version' => $latestVersion['max_panel_version'] ?? null,
                ] : null,
            ];

            $formattedVersions = array_map(static function (array $ver): array {
                return [
                    'id' => $ver['id'] ?? null,
                    'version' => $ver['version'] ?? null,
                    'download_url' => isset($ver['download_url']) ? ('https://api.featherpanel.com' . $ver['download_url']) : null,
                    'file_size' => $ver['file_size'] ?? null,
                    'file_hash' => $ver['file_hash'] ?? null,
                    'changelog' => $ver['changelog'] ?? null,
                    'dependencies' => $ver['dependencies'] ?? [],
                    'min_panel_version' => $ver['min_panel_version'] ?? null,
                    'max_panel_version' => $ver['max_panel_version'] ?? null,
                    'downloads' => $ver['downloads'] ?? 0,
                    'created_at' => $ver['created_at'] ?? null,
                    'updated_at' => $ver['updated_at'] ?? null,
                ];
            }, $versions);

            return ApiResponse::success([
                'package' => $package,
                'versions' => $formattedVersions,
            ], 'Package details fetched', 200);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to fetch package details for ' . $identifier . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to fetch package details: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/plugins/online/tag/{tag}',
        summary: 'Search packages by tag',
        description: 'Retrieve packages that have a specific tag, with pagination.',
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
            $base = 'https://api.featherpanel.com/packages/tag/' . urlencode($tag);
            $page = (int) ($request->query->get('page') ?? 1);
            $perPage = (int) ($request->query->get('per_page') ?? 20);
            $query = [];
            if ($page > 0) {
                $query['page'] = (string) $page;
            }
            if ($perPage > 0) {
                $query['per_page'] = (string) $perPage;
            }
            $url = $base . (!empty($query) ? ('?' . http_build_query($query)) : '');
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'ignore_errors' => true,
                ],
            ]);
            $response = @file_get_contents($url, false, $context);
            if ($response === false) {
                return ApiResponse::error('Failed to fetch packages by tag', 'TAG_FETCH_FAILED', 500);
            }

            $data = json_decode($response, true);
            if (!is_array($data) || !isset($data['data']['packages']) || !is_array($data['data']['packages'])) {
                return ApiResponse::error('Invalid response from tag API', 'TAG_INVALID', 500);
            }

            $packages = $data['data']['packages'];
            $addons = array_map(static function (array $pkg): array {
                $latest = $pkg['latest_version'] ?? [];
                $downloadUrl = isset($latest['download_url']) ? ('https://api.featherpanel.com' . $latest['download_url']) : null;

                $iconUrl = $pkg['icon_url'] ?? null;
                if (!empty($iconUrl) && is_string($iconUrl)) {
                    if (strpos($iconUrl, 'http://') === 0) {
                        $iconUrl = 'https://' . substr($iconUrl, 7);
                    }
                }

                return [
                    'id' => $pkg['id'] ?? null,
                    'identifier' => $pkg['name'] ?? '',
                    'name' => $pkg['display_name'] ?? ($pkg['name'] ?? ''),
                    'description' => $pkg['description'] ?? null,
                    'icon' => $iconUrl,
                    'website' => $pkg['website'] ?? null,
                    'author' => $pkg['author'] ?? null,
                    'author_email' => $pkg['author_email'] ?? null,
                    'maintainers' => $pkg['maintainers'] ?? [],
                    'tags' => $pkg['tags'] ?? [],
                    'verified' => isset($pkg['verified']) ? (int) $pkg['verified'] === 1 : false,
                    'premium' => isset($pkg['premium']) ? (int) $pkg['premium'] : 0,
                    'premium_link' => $pkg['premium_link'] ?? null,
                    'premium_price' => $pkg['premium_price'] ?? null,
                    'downloads' => $pkg['downloads'] ?? 0,
                    'created_at' => $pkg['created_at'] ?? null,
                    'updated_at' => $pkg['updated_at'] ?? null,
                    'latest_version' => [
                        'version' => $latest['version'] ?? null,
                        'download_url' => $downloadUrl,
                        'file_size' => $latest['file_size'] ?? null,
                        'created_at' => $latest['created_at'] ?? null,
                    ],
                ];
            }, $packages);

            $pagination = $data['data']['pagination'] ?? null;
            $tagName = $data['data']['tag'] ?? $tag;

            return ApiResponse::success([
                'addons' => $addons,
                'tag' => $tagName,
                'pagination' => $pagination,
            ], 'Packages by tag fetched', 200);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to fetch packages by tag ' . $tag . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to fetch packages by tag: ' . $e->getMessage(), 500);
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
            // Fetch package details
            $base = 'https://api.featherpanel.com/packages/' . urlencode($identifier);
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'ignore_errors' => true,
                ],
            ]);
            $response = @file_get_contents($base, false, $context);
            if ($response === false) {
                return ApiResponse::error('Failed to fetch package details', 'PACKAGE_DETAILS_FETCH_FAILED', 500);
            }

            $data = json_decode($response, true);
            if (!is_array($data) || !isset($data['data']['package'])) {
                return ApiResponse::error('Package not found', 'PACKAGE_NOT_FOUND', 404);
            }

            $pkg = $data['data']['package'];
            $latestVersion = $data['data']['latest_version'] ?? [];

            // Check if already installed and get installed version
            if (!defined('APP_ADDONS_DIR')) {
                define('APP_ADDONS_DIR', dirname(__DIR__, 3) . '/storage/addons');
            }
            $pluginDir = APP_ADDONS_DIR . '/' . $identifier;
            $alreadyInstalled = file_exists($pluginDir);
            $installedVersion = null;
            $updateAvailable = false;

            if ($alreadyInstalled) {
                try {
                    $installedConfig = \App\Plugins\PluginConfig::getConfig($identifier);
                    $installedVersion = $installedConfig['plugin']['version'] ?? null;

                    // Compare versions if both exist
                    if ($installedVersion && isset($latestVersion['version'])) {
                        $normalizeVersion = static function (string $version): string {
                            return ltrim($version, 'vV');
                        };
                        $installedNormalized = $normalizeVersion($installedVersion);
                        $latestNormalized = $normalizeVersion($latestVersion['version']);

                        // Check if update is available (latest > installed)
                        if (version_compare($latestNormalized, $installedNormalized, '>')) {
                            $updateAvailable = true;
                        }
                    }
                } catch (\Exception $e) {
                    // Failed to read installed version, assume no update
                }
            }

            // Get dependencies from latest version
            $dependencies = $latestVersion['dependencies'] ?? [];
            $minPanelVersion = $latestVersion['min_panel_version'] ?? null;
            $maxPanelVersion = $latestVersion['max_panel_version'] ?? null;

            // Check panel version
            $panelVersionOk = true;
            $panelVersionMessage = null;
            if ($minPanelVersion || $maxPanelVersion) {
                // Get current panel version from APP_VERSION constant (defined in index.php)
                $currentVersion = defined('APP_VERSION') ? APP_VERSION : 'unknown';

                // Normalize versions for comparison (strip 'v' prefix if present)
                // Panel uses 'v1.0.3' format, plugins use '1.0.3' format
                $normalizeVersion = static function (string $version): string {
                    return ltrim($version, 'vV');
                };

                $currentVersionNormalized = $normalizeVersion($currentVersion);
                $displayVersion = $currentVersion; // Keep original for display

                // Compare versions (normalized without 'v' prefix)
                if ($minPanelVersion) {
                    $minVersionNormalized = $normalizeVersion($minPanelVersion);
                    if (version_compare($currentVersionNormalized, $minVersionNormalized, '<')) {
                        $panelVersionOk = false;
                        $panelVersionMessage = "Requires panel version {$minPanelVersion} or higher (current: {$displayVersion})";
                    }
                }
                if ($maxPanelVersion) {
                    $maxVersionNormalized = $normalizeVersion($maxPanelVersion);
                    if (version_compare($currentVersionNormalized, $maxVersionNormalized, '>')) {
                        $panelVersionOk = false;
                        $panelVersionMessage = "Requires panel version {$maxPanelVersion} or lower (current: {$displayVersion})";
                    }
                }
            }

            // Check dependencies
            $dependencyChecks = [];
            $allDependenciesMet = true;

            // Download and parse conf.yml to check dependencies
            $downloadUrl = isset($latestVersion['download_url']) ? ('https://api.featherpanel.com' . $latestVersion['download_url']) : null;
            if ($downloadUrl) {
                $tempFile = sys_get_temp_dir() . '/' . uniqid('featherpanel_check_', true) . '.fpa';
                $fileContent = @file_get_contents($downloadUrl, false, $context);
                if ($fileContent !== false) {
                    file_put_contents($tempFile, $fileContent);

                    // Extract conf.yml
                    $tempDir = sys_get_temp_dir() . '/' . uniqid('featherpanel_check_', true);
                    @mkdir($tempDir, 0755, true);
                    $pwd = self::PASSWORD;
                    $unzipCommand = sprintf('unzip -P %s %s conf.yml -d %s', escapeshellarg($pwd), escapeshellarg($tempFile), escapeshellarg($tempDir));
                    exec($unzipCommand, $out, $code);

                    if ($code === 0 && file_exists($tempDir . '/conf.yml')) {
                        try {
                            $conf = \Symfony\Component\Yaml\Yaml::parseFile($tempDir . '/conf.yml');
                            $confDependencies = $conf['plugin']['dependencies'] ?? [];

                            foreach ($confDependencies as $dep) {
                                $met = false;
                                $message = '';

                                if (strpos($dep, 'composer=') === 0) {
                                    $composerPkg = substr($dep, strlen('composer='));
                                    $met = \App\Plugins\Dependencies\ComposerDependencies::isInstalled($composerPkg);
                                    $message = $met ? 'Composer package installed' : "Composer package required: {$composerPkg}";
                                } elseif (strpos($dep, 'plugin=') === 0) {
                                    $pluginDep = substr($dep, strlen('plugin='));
                                    $met = \App\Plugins\Dependencies\AppDependencies::isInstalled($pluginDep);
                                    $message = $met ? 'Plugin installed' : "Plugin required: {$pluginDep}";
                                } elseif (strpos($dep, 'php=') === 0) {
                                    $phpVersion = substr($dep, strlen('php='));
                                    $met = \App\Plugins\Dependencies\PhpVersionDependencies::isInstalled($phpVersion);
                                    $message = $met ? 'PHP version requirement met' : "PHP version required: {$phpVersion}";
                                } elseif (strpos($dep, 'php-ext=') === 0) {
                                    $ext = substr($dep, strlen('php-ext='));
                                    $met = \App\Plugins\Dependencies\PhpExtensionDependencies::isInstalled($ext);
                                    $message = $met ? 'PHP extension installed' : "PHP extension required: {$ext}";
                                } else {
                                    $met = true; // Unknown dependency format, assume met
                                    $message = "Unknown dependency format: {$dep}";
                                }

                                $dependencyChecks[] = [
                                    'dependency' => $dep,
                                    'met' => $met,
                                    'message' => $message,
                                ];

                                if (!$met) {
                                    $allDependenciesMet = false;
                                }
                            }
                        } catch (\Exception $e) {
                            // Failed to parse conf.yml, skip dependency checks
                        }
                    }

                    @exec('rm -rf ' . escapeshellarg($tempDir));
                    @unlink($tempFile);
                }
            }

            // Can install if: not installed OR update available, and all requirements met
            $canInstall = (!$alreadyInstalled || $updateAvailable) && $panelVersionOk && $allDependenciesMet;

            return ApiResponse::success([
                'can_install' => $canInstall,
                'already_installed' => $alreadyInstalled,
                'update_available' => $updateAvailable,
                'installed_version' => $installedVersion,
                'latest_version' => $latestVersion['version'] ?? null,
                'package' => [
                    'identifier' => $identifier,
                    'name' => $pkg['display_name'] ?? ($pkg['name'] ?? ''),
                    'description' => $pkg['description'] ?? null,
                    'version' => $latestVersion['version'] ?? null,
                    'author' => $pkg['author'] ?? null,
                    'verified' => isset($pkg['verified']) ? (int) $pkg['verified'] === 1 : false,
                    'premium' => isset($pkg['premium']) ? (int) $pkg['premium'] : 0,
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
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to check requirements for ' . $identifier . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to check requirements: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/plugins/online/install',
        summary: 'Install addon from online registry',
        description: 'Download and install an addon from the FeatherPanel packages API. Downloads the latest version and extracts it to the addons directory.',
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
            new OA\Response(response: 422, description: 'Unprocessable Entity - Failed to extract addon package or migrations failed'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to install addon or download failed'),
        ]
    )]
    public function install(Request $request): Response
    {
        try {
            $body = json_decode($request->getContent(), true);
            $identifier = $body['identifier'] ?? null;
            if (!$identifier || !preg_match('/^[a-zA-Z0-9_\-]+$/', (string) $identifier)) {
                return ApiResponse::error('Invalid identifier', 'INVALID_IDENTIFIER', 400);
            }

            if (!defined('APP_ADDONS_DIR')) {
                define('APP_ADDONS_DIR', dirname(__DIR__, 3) . '/storage/addons');
            }

            // Ensure addons dir exists
            if (!is_dir(APP_ADDONS_DIR) && !@mkdir(APP_ADDONS_DIR, 0755, true)) {
                return ApiResponse::error('Failed to prepare addons directory', 'ADDONS_DIR_CREATE_FAILED', 500);
            }

            // Fetch package metadata directly by identifier (same approach as show method)
            $base = 'https://api.featherpanel.com/packages/' . urlencode($identifier);
            $context = stream_context_create([
                'http' => [
                    'timeout' => 15,
                    'ignore_errors' => true,
                ],
            ]);
            $response = @file_get_contents($base, false, $context);
            if ($response === false) {
                return ApiResponse::error('Failed to fetch package details', 'PACKAGE_DETAILS_FETCH_FAILED', 500);
            }

            $data = json_decode($response, true);
            if (!is_array($data) || !isset($data['data']['package'])) {
                return ApiResponse::error('Package not found in registry', 'PACKAGE_NOT_FOUND', 404);
            }

            $pkg = $data['data']['package'];
            $latestVersion = $data['data']['latest_version'] ?? [];

            // Check if addon is premium
            $isPremium = isset($pkg['premium']) && (int) $pkg['premium'] === 1;
            $fileContent = false;

            if ($isPremium) {
                // Check if FeatherCloud credentials are configured BEFORE attempting download
                $featherCloudClient = new \App\Services\FeatherCloud\FeatherCloudClient();
                if (!$featherCloudClient->isConfigured()) {
                    $premiumLink = $pkg['premium_link'] ?? null;

                    return ApiResponse::error(
                        'FeatherCloud credentials are not configured. Please configure your cloud account credentials in Cloud Management to download premium plugins.',
                        'CLOUD_CREDENTIALS_NOT_CONFIGURED',
                        503,
                        [
                            'premium_link' => $premiumLink,
                            'premium_price' => $pkg['premium_price'] ?? null,
                        ]
                    );
                }

                // For premium plugins, try to download via FeatherCloud
                try {
                    // Get version from latest_version or request
                    $version = $latestVersion['version'] ?? ($body['version'] ?? null);
                    if (!$version) {
                        return ApiResponse::error(
                            'Version is required for premium plugins',
                            'VERSION_REQUIRED',
                            400,
                            [
                                'premium_link' => $pkg['premium_link'] ?? null,
                                'premium_price' => $pkg['premium_price'] ?? null,
                            ]
                        );
                    }

                    // Download premium package via FeatherCloud
                    $fileContent = $featherCloudClient->downloadPremiumPackage($identifier, $version);
                } catch (\App\Services\FeatherCloud\FeatherCloudException $e) {
                    // If FeatherCloud download fails, return error with purchase info
                    $premiumLink = $pkg['premium_link'] ?? null;

                    // Don't spam with credentials error if it's already checked
                    if ($e->getErrorCode() === 'CREDENTIALS_NOT_CONFIGURED') {
                        return ApiResponse::error(
                            'FeatherCloud credentials are not configured. Please configure your cloud account credentials in Cloud Management to download premium plugins.',
                            'CLOUD_CREDENTIALS_NOT_CONFIGURED',
                            503,
                            [
                                'premium_link' => $premiumLink,
                                'premium_price' => $pkg['premium_price'] ?? null,
                            ]
                        );
                    }

                    return ApiResponse::error(
                        $e->getMessage() ?: 'This is a premium addon and must be purchased',
                        $e->getErrorCode() ?: 'PREMIUM_ADDON_PURCHASE_REQUIRED',
                        $e->getHttpStatusCode() ?: 402,
                        [
                            'premium_link' => $premiumLink,
                            'premium_price' => $pkg['premium_price'] ?? null,
                        ]
                    );
                }
            } else {
                // For free plugins, download from public API
                // Get download URL from latest version
                if (!isset($latestVersion['download_url'])) {
                    return ApiResponse::error('Package has no download URL available', 'PACKAGE_NO_DOWNLOAD_URL', 404);
                }

                $downloadUrl = 'https://api.featherpanel.com' . $latestVersion['download_url'];
                $fileContent = @file_get_contents($downloadUrl, false, $context);
                if ($fileContent === false) {
                    return ApiResponse::error('Failed to download addon package', 'ADDON_DOWNLOAD_FAILED', 500);
                }
            }

            $tempFile = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true) . '.fpa';
            file_put_contents($tempFile, $fileContent);

            // Extract
            $tempDir = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true);
            @mkdir($tempDir, 0755, true);
            $pwd = self::PASSWORD;
            $unzipCommand = sprintf('unzip -P %s %s -d %s', escapeshellarg($pwd), escapeshellarg($tempFile), escapeshellarg($tempDir));
            exec($unzipCommand, $out, $code);
            @unlink($tempFile);
            if ($code !== 0) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to extract addon package', 'ADDON_EXTRACT_FAILED', 422);
            }

            $installResult = $this->performAddonInstall($tempDir, $identifier, $pkg['id'] ?? null);

            // If install was successful, log activity and emit event
            if ($installResult->getStatusCode() === 200 || $installResult->getStatusCode() === 201) {
                $currentUser = $request->get('user');
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
