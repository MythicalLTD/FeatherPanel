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
use App\Chat\TimedTask;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class DashboardController
{
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
                        new OA\Property(property: 'count', type: 'object', description: 'System resource counts', properties: [
                            new OA\Property(property: 'users', type: 'integer', description: 'Total number of users'),
                            new OA\Property(property: 'nodes', type: 'integer', description: 'Total number of nodes'),
                            new OA\Property(property: 'spells', type: 'integer', description: 'Total number of spells (eggs)'),
                            new OA\Property(property: 'servers', type: 'integer', description: 'Total number of servers'),
                        ]),
                        new OA\Property(property: 'cron', type: 'object', description: 'Cron task information', properties: [
                            new OA\Property(property: 'recent', type: 'array', description: 'Recent cron task executions (last 10)', items: new OA\Items(properties: [
                                new OA\Property(property: 'id', type: 'integer', description: 'Task ID'),
                                new OA\Property(property: 'task_name', type: 'string', description: 'Name of the cron task', example: 'server-schedule-processor'),
                                new OA\Property(property: 'last_run_at', type: 'string', format: 'date-time', nullable: true, description: 'Last execution timestamp'),
                                new OA\Property(property: 'last_run_success', type: 'boolean', description: 'Whether the last run was successful'),
                                new OA\Property(property: 'last_run_message', type: 'string', nullable: true, description: 'Last run message or error'),
                                new OA\Property(property: 'expected_interval_seconds', type: 'integer', description: 'Expected interval between runs in seconds'),
                                new OA\Property(property: 'late', type: 'boolean', description: 'Whether the task is running late'),
                            ])),
                            new OA\Property(property: 'summary', type: 'string', nullable: true, description: 'Summary message if no cron tasks have run'),
                        ]),
                        new OA\Property(property: 'changelog', type: 'array', description: 'System changelog entries (currently empty)', items: new OA\Items(type: 'string')),
                        new OA\Property(property: 'version', type: 'object', description: 'Version information', properties: [
                            new OA\Property(property: 'current', type: 'object', description: 'Current version details', properties: [
                                new OA\Property(property: 'id', type: 'integer', description: 'Version ID'),
                                new OA\Property(property: 'version', type: 'string', description: 'Version string'),
                                new OA\Property(property: 'type', type: 'string', description: 'Version type (stable/beta/canary)'),
                                new OA\Property(property: 'release_name', type: 'string', description: 'Release name'),
                                new OA\Property(property: 'description', type: 'string', description: 'Version description'),
                                new OA\Property(property: 'min_supported_php', type: 'string', description: 'Minimum supported PHP version'),
                                new OA\Property(property: 'max_supported_php', type: 'string', description: 'Maximum supported PHP version'),
                                new OA\Property(property: 'is_security_release', type: 'boolean', description: 'Whether this is a security release'),
                                new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Version creation timestamp'),
                                new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Version last update timestamp'),
                            ]),
                            new OA\Property(property: 'latest', type: 'object', nullable: true, description: 'Latest version details', properties: [
                                new OA\Property(property: 'id', type: 'integer', description: 'Version ID'),
                                new OA\Property(property: 'version', type: 'string', description: 'Version string'),
                                new OA\Property(property: 'type', type: 'string', description: 'Version type (stable/beta/canary)'),
                                new OA\Property(property: 'release_name', type: 'string', description: 'Release name'),
                                new OA\Property(property: 'description', type: 'string', description: 'Version description'),
                                new OA\Property(property: 'min_supported_php', type: 'string', description: 'Minimum supported PHP version'),
                                new OA\Property(property: 'max_supported_php', type: 'string', description: 'Maximum supported PHP version'),
                                new OA\Property(property: 'is_security_release', type: 'boolean', description: 'Whether this is a security release'),
                                new OA\Property(property: 'changelog_fixed', type: 'array', items: new OA\Items(type: 'string'), description: 'Fixed items in changelog'),
                                new OA\Property(property: 'changelog_added', type: 'array', items: new OA\Items(type: 'string'), description: 'Added items in changelog'),
                                new OA\Property(property: 'changelog_removed', type: 'array', items: new OA\Items(type: 'string'), description: 'Removed items in changelog'),
                                new OA\Property(property: 'changelog_improved', type: 'array', items: new OA\Items(type: 'string'), description: 'Improved items in changelog'),
                                new OA\Property(property: 'changelog_updated', type: 'array', items: new OA\Items(type: 'string'), description: 'Updated items in changelog'),
                                new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Version creation timestamp'),
                                new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Version last update timestamp'),
                            ]),
                            new OA\Property(property: 'update_available', type: 'boolean', description: 'Whether an update is available'),
                            new OA\Property(property: 'last_checked', type: 'string', format: 'date-time', nullable: true, description: 'When version was last checked'),
                        ]),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to fetch dashboard statistics'),
        ]
    )]
    public function index(Request $request): Response
    {
        try {
            // Get counts for dashboard statistics
            $userCount = User::getCount();
            $nodeCount = Node::getNodesCount();
            $spellCount = Spell::getSpellsCount();
            $serverCount = Server::getCount();

            $version = APP_VERSION;
            $upstream = APP_UPSTREAM;

            // Get version information with caching (15 minutes)
            $versionCacheKey = "dashboard_version_info_{$upstream}";
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
                $lastRunAt = isset($row['last_run_at']) && $row['last_run_at'] !== null ? strtotime($row['last_run_at']) : null;
                $expected = $expectedMap[$name] ?? 300; // default 5 minutes if unknown
                $late = $lastRunAt ? (($now - $lastRunAt) > ($expected * 2)) : true; // late if never ran or >2x expected

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
                ],
                'cron' => [
                    'recent' => $recentCrons,
                    'summary' => empty($recentCrons) ? 'Cron tasks have not run yet.' : null,
                ],
                'version' => $versionInfo,
            ];

            return ApiResponse::success($dashboardData, 'Successfully fetched dashboard statistics', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch dashboard statistics: ' . $e->getMessage(), 500);
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
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string', example: 'System cache has been cleared successfully.'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to clear cache'),
        ]
    )]
    public function clearCache(Request $request): Response
    {
        try {
            Cache::clear();

            return ApiResponse::success([], 'System cache has been cleared successfully.', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to clear system cache: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Fetch version information from the API.
     *
     * @param string $upstream The upstream type (stable/beta/canary)
     * @param string $currentVersion The current application version
     *
     * @return array Version information
     */
    private function fetchVersionInfo(string $upstream, string $currentVersion): array
    {
        $logger = App::getInstance(true)->getLogger();

        $versionInfo = [
            'current' => null,
            'latest' => null,
            'update_available' => false,
            'last_checked' => date('c'), // ISO 8601 format
        ];

        try {
            // Fetch current version details
            $currentVersionUrl = 'https://api.featherpanel.com/versions/' . $currentVersion;
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'user_agent' => 'FeatherPanel/' . $currentVersion,
                ],
            ]);

            $logger->debug('Attempting to fetch current version from: ' . $currentVersionUrl);
            $currentVersionResponse = @file_get_contents($currentVersionUrl, false, $context);

            if ($currentVersionResponse !== false) {
                $logger->debug('Current version API response received: ' . substr($currentVersionResponse, 0, 200) . '...');
                $currentVersionData = json_decode($currentVersionResponse, true);
                if (isset($currentVersionData['success']) && $currentVersionData['success'] && isset($currentVersionData['data']['version'])) {
                    $versionData = $currentVersionData['data']['version'];
                    $versionInfo['current'] = [
                        'version' => $versionData['version'] ?? $currentVersion,
                        'type' => $versionData['type'] ?? 'Stable',
                        'release_name' => $versionData['release_name'] ?? 'Unknown Release',
                        'release_description' => $versionData['release_description'] ?? '',
                        'php_version' => $versionData['php_version'] ?? '8.2',
                        'changelog_added' => $versionData['changelog_added'] ?? [],
                        'changelog_fixed' => $versionData['changelog_fixed'] ?? [],
                        'changelog_improved' => $versionData['changelog_improved'] ?? [],
                        'changelog_updated' => $versionData['changelog_updated'] ?? [],
                        'changelog_removed' => $versionData['changelog_removed'] ?? [],
                    ];
                    $logger->debug('Successfully fetched current version details: ' . $currentVersion);
                } else {
                    $logger->warning('Failed to parse current version response. Success: ' . ($currentVersionData['success'] ?? 'not set') . ', Response: ' . $currentVersionResponse);
                }
            } else {
                $error = error_get_last();
                $logger->warning('Failed to fetch current version from API. Error: ' . ($error['message'] ?? 'Unknown error'));
            }

            // Fetch latest version details
            $latestVersionUrl = 'https://api.featherpanel.com/versions/latest?type=' . $upstream;
            $logger->debug('Attempting to fetch latest version from: ' . $latestVersionUrl);
            $latestVersionResponse = @file_get_contents($latestVersionUrl, false, $context);

            if ($latestVersionResponse !== false) {
                $logger->debug('Latest version API response received: ' . substr($latestVersionResponse, 0, 200) . '...');
                $latestVersionData = json_decode($latestVersionResponse, true);
                if (isset($latestVersionData['success']) && $latestVersionData['success'] && isset($latestVersionData['data']['version'])) {
                    $latestData = $latestVersionData['data']['version'];
                    $versionInfo['latest'] = [
                        'version' => $latestData['version'] ?? 'Unknown',
                        'type' => $latestData['type'] ?? $upstream,
                        'release_description' => $latestData['release_description'] ?? '',
                        'changelog_added' => $latestData['changelog_added'] ?? [],
                        'changelog_fixed' => $latestData['changelog_fixed'] ?? [],
                        'changelog_improved' => $latestData['changelog_improved'] ?? [],
                        'changelog_updated' => $latestData['changelog_updated'] ?? [],
                        'changelog_removed' => $latestData['changelog_removed'] ?? [],
                    ];

                    // Compare versions
                    if (isset($versionInfo['current']['version']) && isset($versionInfo['latest']['version'])) {
                        $versionInfo['update_available'] = version_compare($versionInfo['current']['version'], $versionInfo['latest']['version'], '<');
                    }

                    $latestVersion = $versionInfo['latest']['version'];
                    $logger->debug('Successfully fetched latest version details: ' . $latestVersion);
                } else {
                    $logger->warning('Failed to parse latest version response. Success: ' . ($latestVersionData['success'] ?? 'not set') . ', Response: ' . $latestVersionResponse);
                }
            } else {
                $error = error_get_last();
                $logger->warning('Failed to fetch latest version from API. Error: ' . ($error['message'] ?? 'Unknown error'));
            }
        } catch (\Exception $e) {
            $logger->error('Failed to fetch version information: ' . $e->getMessage());
        }

        return $versionInfo;
    }
}
