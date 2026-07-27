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
use App\Chat\Node;
use App\Chat\User;
use App\Chat\Spell;
use App\Cache\Cache;
use App\Chat\Server;
use App\Chat\VmNode;
use App\Chat\Database;
use App\Chat\TimedTask;
use App\Chat\VmInstance;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class DashboardController
{
    private const UPDATE_SERVER_BASE = 'https://update.mythicalsystems.org';
    private const UPDATE_PROJECT_SLUG = 'featherpanel';

    #[OA\Get(
        path: '/api/admin/dashboard',
        summary: 'Get dashboard statistics',
        description: 'Retrieve comprehensive dashboard statistics including user counts, node counts, spell counts, server counts, and recent cron task status.',
        tags: ['Admin - Dashboard'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Dashboard statistics retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'count',
                            type: 'object',
                            description: 'System resource counts',
                            properties: [
                                new OA\Property(
                                    property: 'users',
                                    type: 'integer',
                                    description: 'Total number of users',
                                ),
                                new OA\Property(
                                    property: 'nodes',
                                    type: 'integer',
                                    description: 'Total number of nodes',
                                ),
                                new OA\Property(
                                    property: 'spells',
                                    type: 'integer',
                                    description: 'Total number of spells (eggs)',
                                ),
                                new OA\Property(
                                    property: 'servers',
                                    type: 'integer',
                                    description: 'Total number of servers',
                                ),
                            ],
                        ),
                        new OA\Property(
                            property: 'cron',
                            type: 'object',
                            description: 'Cron task information',
                            properties: [
                                new OA\Property(
                                    property: 'recent',
                                    type: 'array',
                                    description: 'Recent cron task executions (last 10)',
                                    items: new OA\Items(
                                        properties: [
                                            new OA\Property(
                                                property: 'id',
                                                type: 'integer',
                                                description: 'Task ID',
                                            ),
                                            new OA\Property(
                                                property: 'task_name',
                                                type: 'string',
                                                description: 'Name of the cron task',
                                                example: 'server-schedule-processor',
                                            ),
                                            new OA\Property(
                                                property: 'last_run_at',
                                                type: 'string',
                                                format: 'date-time',
                                                nullable: true,
                                                description: 'Last execution timestamp',
                                            ),
                                            new OA\Property(
                                                property: 'last_run_success',
                                                type: 'boolean',
                                                description: 'Whether the last run was successful',
                                            ),
                                            new OA\Property(
                                                property: 'last_run_message',
                                                type: 'string',
                                                nullable: true,
                                                description: 'Last run message or error',
                                            ),
                                            new OA\Property(
                                                property: 'expected_interval_seconds',
                                                type: 'integer',
                                                description: 'Expected interval between runs in seconds',
                                            ),
                                            new OA\Property(
                                                property: 'late',
                                                type: 'boolean',
                                                description: 'Whether the task is running late',
                                            ),
                                        ],
                                    ),
                                ),
                                new OA\Property(
                                    property: 'summary',
                                    type: 'string',
                                    nullable: true,
                                    description: 'Summary message if no cron tasks have run',
                                ),
                            ],
                        ),
                        new OA\Property(
                            property: 'changelog',
                            type: 'array',
                            description: 'System changelog entries (currently empty)',
                            items: new OA\Items(type: 'string'),
                        ),
                        new OA\Property(
                            property: 'version',
                            type: 'object',
                            description: 'Version information',
                            properties: [
                                new OA\Property(
                                    property: 'current',
                                    type: 'object',
                                    description: 'Current version details',
                                    properties: [
                                        new OA\Property(
                                            property: 'id',
                                            type: 'integer',
                                            description: 'Version ID',
                                        ),
                                        new OA\Property(
                                            property: 'version',
                                            type: 'string',
                                            description: 'Version string',
                                        ),
                                        new OA\Property(
                                            property: 'type',
                                            type: 'string',
                                            description: 'Version type (stable/beta/canary)',
                                        ),
                                        new OA\Property(
                                            property: 'release_name',
                                            type: 'string',
                                            description: 'Release name',
                                        ),
                                        new OA\Property(
                                            property: 'description',
                                            type: 'string',
                                            description: 'Version description',
                                        ),
                                        new OA\Property(
                                            property: 'min_supported_php',
                                            type: 'string',
                                            description: 'Minimum supported PHP version',
                                        ),
                                        new OA\Property(
                                            property: 'max_supported_php',
                                            type: 'string',
                                            description: 'Maximum supported PHP version',
                                        ),
                                        new OA\Property(
                                            property: 'is_security_release',
                                            type: 'boolean',
                                            description: 'Whether this is a security release',
                                        ),
                                        new OA\Property(
                                            property: 'created_at',
                                            type: 'string',
                                            format: 'date-time',
                                            description: 'Version creation timestamp',
                                        ),
                                        new OA\Property(
                                            property: 'updated_at',
                                            type: 'string',
                                            format: 'date-time',
                                            description: 'Version last update timestamp',
                                        ),
                                    ],
                                ),
                                new OA\Property(
                                    property: 'latest',
                                    type: 'object',
                                    nullable: true,
                                    description: 'Latest version details',
                                    properties: [
                                        new OA\Property(
                                            property: 'id',
                                            type: 'integer',
                                            description: 'Version ID',
                                        ),
                                        new OA\Property(
                                            property: 'version',
                                            type: 'string',
                                            description: 'Version string',
                                        ),
                                        new OA\Property(
                                            property: 'type',
                                            type: 'string',
                                            description: 'Version type (stable/beta/canary)',
                                        ),
                                        new OA\Property(
                                            property: 'release_name',
                                            type: 'string',
                                            description: 'Release name',
                                        ),
                                        new OA\Property(
                                            property: 'description',
                                            type: 'string',
                                            description: 'Version description',
                                        ),
                                        new OA\Property(
                                            property: 'min_supported_php',
                                            type: 'string',
                                            description: 'Minimum supported PHP version',
                                        ),
                                        new OA\Property(
                                            property: 'max_supported_php',
                                            type: 'string',
                                            description: 'Maximum supported PHP version',
                                        ),
                                        new OA\Property(
                                            property: 'is_security_release',
                                            type: 'boolean',
                                            description: 'Whether this is a security release',
                                        ),
                                        new OA\Property(
                                            property: 'changelog_fixed',
                                            type: 'array',
                                            items: new OA\Items(
                                                type: 'string',
                                            ),
                                            description: 'Fixed items in changelog',
                                        ),
                                        new OA\Property(
                                            property: 'changelog_added',
                                            type: 'array',
                                            items: new OA\Items(
                                                type: 'string',
                                            ),
                                            description: 'Added items in changelog',
                                        ),
                                        new OA\Property(
                                            property: 'changelog_removed',
                                            type: 'array',
                                            items: new OA\Items(
                                                type: 'string',
                                            ),
                                            description: 'Removed items in changelog',
                                        ),
                                        new OA\Property(
                                            property: 'changelog_improved',
                                            type: 'array',
                                            items: new OA\Items(
                                                type: 'string',
                                            ),
                                            description: 'Improved items in changelog',
                                        ),
                                        new OA\Property(
                                            property: 'changelog_updated',
                                            type: 'array',
                                            items: new OA\Items(
                                                type: 'string',
                                            ),
                                            description: 'Updated items in changelog',
                                        ),
                                        new OA\Property(
                                            property: 'created_at',
                                            type: 'string',
                                            format: 'date-time',
                                            description: 'Version creation timestamp',
                                        ),
                                        new OA\Property(
                                            property: 'updated_at',
                                            type: 'string',
                                            format: 'date-time',
                                            description: 'Version last update timestamp',
                                        ),
                                    ],
                                ),
                                new OA\Property(
                                    property: 'update_available',
                                    type: 'boolean',
                                    description: 'Whether an update is available',
                                ),
                                new OA\Property(
                                    property: 'last_checked',
                                    type: 'string',
                                    format: 'date-time',
                                    nullable: true,
                                    description: 'When version was last checked',
                                ),
                            ],
                        ),
                    ],
                ),
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(
                response: 403,
                description: 'Forbidden - Insufficient permissions',
            ),
            new OA\Response(
                response: 500,
                description: 'Internal server error - Failed to fetch dashboard statistics',
            ),
        ],
    ),]
    public function index(Request $request): Response
    {
        try {
            // Get counts for dashboard statistics
            $userCount = User::getCount();
            $nodeCount = Node::getNodesCount();
            $spellCount = Spell::getSpellsCount();
            $serverCount = Server::getCount();
            $vmNodeCount = VmNode::getVmNodesCount();
            $vmInstanceCount = VmInstance::countAll();

            $version = APP_VERSION;
            $upstream = APP_UPSTREAM;

            // Get version information with caching (15 minutes)
            $versionCacheKey = "dashboard_version_info_v2_{$upstream}";
            $versionInfo = Cache::get($versionCacheKey);

            if ($versionInfo === null) {
                $versionInfo = $this->fetchVersionInfo($upstream, $version);
                Cache::put($versionCacheKey, $versionInfo, 15); // Cache for 15 minutes
            }

            // Recent cron/timed task heartbeats
            $recentCronsRaw = TimedTask::getAll(null, 10, 0);
            $now = time();
            $expectedMap = [
                'server-schedule-processor' => 60, // seconds
                'mail-sender' => 60,
            ];
            $recentCrons = array_map(function ($row) use ($now, $expectedMap) {
                $name = $row['task_name'] ?? '';
                // Parse last_run_at as UTC since it is stored via UTC_TIMESTAMP()
                $lastRunAt = null;
                if (isset($row['last_run_at']) && $row['last_run_at'] !== null) {
                    try {
                        $dateTime = new \DateTime(
                            $row['last_run_at'],
                            new \DateTimeZone('UTC')
                        );
                        $lastRunAt = $dateTime->getTimestamp();
                    } catch (\Exception $e) {
                        $lastRunAt = null;
                    }
                }

                $expected = $expectedMap[$name] ?? 300; // default 5 minutes if unknown
                $late = $lastRunAt ? $now - $lastRunAt > $expected * 2 : true; // late if never ran or >2x expected

                return [
                    'id' => (int) ($row['id'] ?? 0),
                    'task_name' => $name,
                    'last_run_at' => $row['last_run_at'] ?? null,
                    'last_run_success' => (int) ($row['last_run_success'] ?? 0) === 1,
                    'last_run_message' => $row['last_run_message'] ?? null,
                    'expected_interval_seconds' => $expected,
                    'late' => $late,
                ];
            }, $recentCronsRaw);

            $dashboardData = [
                'count' => [
                    'users' => $userCount,
                    'nodes' => $nodeCount,
                    'spells' => $spellCount,
                    'servers' => $serverCount,
                    'vm_nodes' => $vmNodeCount,
                    'vm_instances' => $vmInstanceCount,
                ],
                'cron' => [
                    'recent' => $recentCrons,
                    'summary' => empty($recentCrons)
                        ? 'Cron tasks have not run yet.'
                        : null,
                ],
                'version' => $versionInfo,
            ];

            return ApiResponse::success(
                $dashboardData,
                'Successfully fetched dashboard statistics',
                200,
            );
        } catch (\Exception $e) {
            return ApiResponse::error(
                'Failed to fetch dashboard statistics: ' . $e->getMessage(),
                500,
            );
        }
    }

    /**
     * Clear the system cache.
     *
     * @param Request $request The HTTP request
     *
     * @return Response The HTTP response
     */
    #[OA\Post(
        path: '/api/admin/dashboard/cache/clear',
        summary: 'Clear system cache',
        description: 'Clears all cached data in the system, including redis and file-based cache.',
        tags: ['Admin - Dashboard'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Cache cleared successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'success',
                            type: 'boolean',
                            example: true,
                        ),
                        new OA\Property(
                            property: 'message',
                            type: 'string',
                            example: 'System cache has been cleared successfully.',
                        ),
                    ],
                ),
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(
                response: 403,
                description: 'Forbidden - Insufficient permissions',
            ),
            new OA\Response(
                response: 500,
                description: 'Internal server error - Failed to clear cache',
            ),
        ],
    ),]
    public function clearCache(Request $request): Response
    {
        try {
            Cache::clear();

            // Clear timed tasks because they are not cleared by the cache clear
            Database::runSQL('TRUNCATE TABLE `featherpanel_timed_tasks`');

            return ApiResponse::success(
                [],
                'System cache has been cleared successfully.',
                200,
            );
        } catch (\Exception $e) {
            return ApiResponse::error(
                'Failed to clear system cache: ' . $e->getMessage(),
                500,
            );
        }
    }

    /**
     * Fetch version information from the MythicalSystems Update Server.
     *
     * @param string $upstream The upstream type (stable/beta/canary)
     * @param string $currentVersion The current application version
     *
     * @return array Version information
     *
     * @see https://update.mythicalsystems.org/docs
     */
    private function fetchVersionInfo(
        string $upstream,
        string $currentVersion,
    ): array {
        $logger = App::getInstance(true)->getLogger();

        $versionInfo = [
            'current' => null,
            'latest' => null,
            'update_available' => false,
            'last_checked' => date('c'),
            'runtime_php' => PHP_VERSION,
            'project' => null,
        ];

        $currentListedOnUpdateServer = false;
        $projectMeta = null;

        try {
            $projectMeta = $this->fetchUpdateServerJson('/' . self::UPDATE_PROJECT_SLUG);
            if (is_array($projectMeta) && !isset($projectMeta['error'])) {
                $versionInfo['project'] = [
                    'name' => $projectMeta['name'] ?? 'FeatherPanel',
                    'slug' => $projectMeta['slug'] ?? self::UPDATE_PROJECT_SLUG,
                    'description' => $projectMeta['description'] ?? '',
                    'github_url' => $projectMeta['github_url'] ?? null,
                    'default_type' => $projectMeta['default_type'] ?? 'stable',
                    'min_supported_php' => $projectMeta['min_supported_php'] ?? null,
                    'max_supported_php' => $projectMeta['max_supported_php'] ?? null,
                ];
            }

            $currentRelease = $this->fetchUpdateServerRelease($currentVersion);
            if ($currentRelease !== null) {
                $versionInfo['current'] = $this->mapUpdateReleasePayload($currentRelease);
                $currentListedOnUpdateServer = true;
                $logger->debug(
                    'Successfully fetched current version details: ' . $currentVersion,
                );
            }

            $latestRelease = $this->resolveLatestUpdateRelease($upstream, $projectMeta);
            if ($latestRelease !== null) {
                $versionInfo['latest'] = $this->mapUpdateReleasePayload($latestRelease);
                $logger->debug(
                    'Successfully fetched latest version details: ' .
                        ($versionInfo['latest']['version'] ?? 'unknown'),
                );
            }

            if (
                isset($versionInfo['current']['version'], $versionInfo['latest']['version'])
            ) {
                $versionInfo['update_available'] = $this->isVersionOlder(
                    (string) $versionInfo['current']['version'],
                    (string) $versionInfo['latest']['version'],
                );
            }
        } catch (\Exception $e) {
            $logger->error(
                'Failed to fetch version information: ' . $e->getMessage(),
            );
        }

        // Dev images and builds not listed on the update server — still expose APP_VERSION in the UI.
        if ($versionInfo['current'] === null) {
            $norm = $this->normalizeVersionString($currentVersion);
            if ($norm === '' || strcasecmp($norm, 'unknown') === 0) {
                $norm = $this->normalizeVersionString(
                    (string) (defined('APP_VERSION') ? APP_VERSION : ''),
                ) ?: 'unknown';
            }

            $channel = strtolower(
                (string) getenv('FEATHERPANEL_VERSION_CHANNEL'),
            );
            $isDevChannel = \in_array($channel, ['development', 'dev'], true);

            // Plain dotted numeric versions only — anything else is treated as a development-style build.
            $isPlainSemver = (bool) preg_match('/^\d+(\.\d+)*$/', $norm);

            $type = 'Stable';
            if ($upstream !== 'stable' && $upstream !== '') {
                $type = ucfirst($upstream);
            }
            if ($isDevChannel || !$isPlainSemver) {
                $type = 'Development';
            }

            $minPhp = is_array($projectMeta) ? ($projectMeta['min_supported_php'] ?? null) : null;
            $maxPhp = is_array($projectMeta) ? ($projectMeta['max_supported_php'] ?? null) : null;

            $versionInfo['current'] = [
                'version' => $norm,
                'type' => $type,
                'release_name' => $type === 'Development'
                    ? 'Development build'
                    : 'FeatherPanel',
                'release_description' => '',
                'description' => '',
                'php_version' => $this->formatPhpVersionRange($minPhp, $maxPhp) ?? PHP_VERSION,
                'min_supported_php' => $minPhp,
                'max_supported_php' => $maxPhp,
                'is_security_release' => false,
                'github_html_url' => null,
                'published_at' => null,
                'changelog_added' => [],
                'changelog_fixed' => [],
                'changelog_improved' => [],
                'changelog_updated' => [],
                'changelog_removed' => [],
            ];

            // Do not nag "update to latest stable" while on a dev/development channel Docker stack.
            if ($isDevChannel || $type === 'Development') {
                $versionInfo['update_available'] = false;
            } elseif (isset($versionInfo['latest']['version'])) {
                $versionInfo['update_available'] = $this->isVersionOlder(
                    $norm,
                    (string) $versionInfo['latest']['version'],
                );
            }
        }

        $versionInfo['current_listed_on_update_server'] = $currentListedOnUpdateServer;

        return $versionInfo;
    }

    /**
     * Resolve the latest release for the configured upstream channel.
     *
     * @param array<string, mixed>|null $projectMeta
     *
     * @return array<string, mixed>|null
     */
    private function resolveLatestUpdateRelease(
        string $upstream,
        ?array $projectMeta,
    ): ?array {
        $upstream = strtolower(trim($upstream)) ?: 'stable';

        if (
            is_array($projectMeta)
            && isset($projectMeta['latest'])
            && is_array($projectMeta['latest'])
            && isset($projectMeta['latest']['version'])
        ) {
            $embedded = $projectMeta['latest'];
            $embeddedType = strtolower((string) ($embedded['type'] ?? 'stable'));
            if ($upstream === 'stable' || $embeddedType === $upstream) {
                return $embedded;
            }
        }

        $latest = $this->fetchUpdateServerJson(
            '/' . self::UPDATE_PROJECT_SLUG . '/latest',
        );
        if (
            is_array($latest)
            && !isset($latest['error'])
            && isset($latest['version'])
        ) {
            $latestType = strtolower((string) ($latest['type'] ?? 'stable'));
            if ($upstream === 'stable' || $latestType === $upstream) {
                return $latest;
            }
        }

        // Non-stable channels: scan recent releases for the matching type.
        if ($upstream !== 'stable') {
            $releases = $this->fetchUpdateServerJson(
                '/' . self::UPDATE_PROJECT_SLUG . '/releases?per_page=50',
            );
            if (is_array($releases) && isset($releases['data']) && is_array($releases['data'])) {
                foreach ($releases['data'] as $release) {
                    if (!is_array($release) || !isset($release['version'])) {
                        continue;
                    }
                    if (strtolower((string) ($release['type'] ?? '')) === $upstream) {
                        return $release;
                    }
                }
            }
        }

        return is_array($latest) && isset($latest['version']) && !isset($latest['error'])
            ? $latest
            : null;
    }

    /**
     * Fetch a single release by version, trying common tag variants.
     *
     * @return array<string, mixed>|null
     */
    private function fetchUpdateServerRelease(string $version): ?array
    {
        $normalized = $this->normalizeVersionString($version);
        if ($normalized === '' || strcasecmp($normalized, 'unknown') === 0) {
            return null;
        }

        $candidates = array_values(array_unique(array_filter([
            $version,
            'v' . $normalized,
            $normalized,
        ])));

        foreach ($candidates as $candidate) {
            $payload = $this->fetchUpdateServerJson(
                '/' . self::UPDATE_PROJECT_SLUG . '/releases/' . rawurlencode($candidate),
            );
            if (
                is_array($payload)
                && !isset($payload['error'])
                && isset($payload['version'])
            ) {
                return $payload;
            }
        }

        return null;
    }

    /**
     * GET JSON from the MythicalSystems Update Server.
     *
     * @return array<string, mixed>|null
     */
    private function fetchUpdateServerJson(string $path): ?array
    {
        $logger = App::getInstance(true)->getLogger();
        $url = self::UPDATE_SERVER_BASE . $path;
        $userAgent = 'FeatherPanel/' . (defined('APP_VERSION') ? APP_VERSION : 'unknown');

        $context = stream_context_create([
            'http' => [
                'timeout' => 10,
                'user_agent' => $userAgent,
                'header' => "Accept: application/json\r\n",
                'ignore_errors' => true,
            ],
        ]);

        $logger->debug('Fetching update server: ' . $url);
        $response = @file_get_contents($url, false, $context);
        if ($response === false) {
            $error = error_get_last();
            $logger->warning(
                'Failed to fetch update server URL ' . $url . ': ' .
                    ($error['message'] ?? 'Unknown error'),
            );

            return null;
        }

        $decoded = json_decode($response, true);
        if (!is_array($decoded)) {
            $logger->warning(
                'Invalid JSON from update server URL ' . $url . ': ' .
                    substr($response, 0, 200),
            );

            return null;
        }

        return $decoded;
    }

    /**
     * Map an update-server release payload into the dashboard version shape.
     *
     * @param array<string, mixed> $release
     *
     * @return array<string, mixed>
     */
    private function mapUpdateReleasePayload(array $release): array
    {
        $minPhp = isset($release['min_supported_php'])
            ? (string) $release['min_supported_php']
            : null;
        $maxPhp = isset($release['max_supported_php'])
            ? (string) $release['max_supported_php']
            : null;
        $description = (string) ($release['description'] ?? '');
        $type = (string) ($release['type'] ?? 'stable');

        return [
            'id' => isset($release['id']) ? (int) $release['id'] : null,
            'version' => $this->normalizeVersionString(
                (string) ($release['version'] ?? 'unknown'),
            ),
            'type' => $type !== '' ? ucfirst($type) : 'Stable',
            'release_name' => (string) ($release['release_name'] ?? ($release['version'] ?? 'Unknown Release')),
            'release_description' => $description,
            'description' => $description,
            'php_version' => $this->formatPhpVersionRange($minPhp, $maxPhp) ?? PHP_VERSION,
            'min_supported_php' => $minPhp,
            'max_supported_php' => $maxPhp,
            'is_security_release' => (bool) ($release['is_security_release'] ?? false),
            'github_html_url' => isset($release['github_html_url'])
                ? (string) $release['github_html_url']
                : null,
            'published_at' => isset($release['published_at'])
                ? (string) $release['published_at']
                : null,
            'changelog_added' => is_array($release['changelog_added'] ?? null)
                ? $release['changelog_added']
                : [],
            'changelog_fixed' => is_array($release['changelog_fixed'] ?? null)
                ? $release['changelog_fixed']
                : [],
            'changelog_improved' => is_array($release['changelog_improved'] ?? null)
                ? $release['changelog_improved']
                : [],
            'changelog_updated' => is_array($release['changelog_updated'] ?? null)
                ? $release['changelog_updated']
                : [],
            'changelog_removed' => is_array($release['changelog_removed'] ?? null)
                ? $release['changelog_removed']
                : [],
        ];
    }

    private function normalizeVersionString(string $version): string
    {
        return ltrim(trim($version), 'vV');
    }

    private function isVersionOlder(string $current, string $latest): bool
    {
        return version_compare(
            $this->normalizeVersionString($current),
            $this->normalizeVersionString($latest),
            '<',
        );
    }

    private function formatPhpVersionRange(?string $min, ?string $max): ?string
    {
        $min = $min !== null && $min !== '' ? $min : null;
        $max = $max !== null && $max !== '' ? $max : null;

        if ($min !== null && $max !== null) {
            return $min === $max ? $min : $min . '–' . $max;
        }

        return $min ?? $max;
    }
}
