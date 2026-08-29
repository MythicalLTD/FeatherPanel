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

namespace App\Services\Backup;

use App\Chat\Node;
use App\Chat\Role;
use App\Chat\Task;
use App\Chat\User;
use App\Chat\Proxy;
use App\Chat\Realm;
use App\Chat\Spell;
use App\Chat\Subuser;
use App\Chat\Subdomain;
use App\Chat\Allocation;
use App\Chat\ServerActivity;
use App\Chat\ServerDatabase;
use App\Chat\ServerSchedule;
use App\Chat\ServerVariable;
use App\Helpers\AvatarHelper;
use App\Services\Wings\Wings;
use App\Chat\DatabaseInstance;
use App\Chat\ServerLifecycleHook;
use App\Chat\ServerCustomVariable;
use App\Chat\ServerLifecycleHookStep;
use App\Services\Database\ServerDatabaseFilesystemBackupService;

/**
 * Build and write a FeatherPanel metadata pack into the server filesystem
 * so it is included in a subsequent Wings file backup archive.
 *
 * Layout under /.featherpanel-backup/:
 *   README.md, index.html, manifest.json, summary.txt, full-pack.json
 *   {section}/{section}.{json,md,txt,html}
 */
class ServerMetadataBackupService
{
    public const METADATA_DIRECTORY = '/.featherpanel-backup';

    /** @deprecated Use METADATA_DIRECTORY; kept for callers expecting a single path. */
    public const METADATA_PATH = '/.featherpanel-backup';

    /**
     * Collect server metadata into a versioned pack.
     *
     * @return array{version: int, exported_at: string, server_uuid: string, include_encrypted: bool, data: array<string, mixed>}
     */
    public static function buildPack(array $server, Wings $wings, bool $includeEncrypted = false, bool $includeActivities = false): array
    {
        $serverId = (int) $server['id'];
        $spell = !empty($server['spell_id']) ? Spell::getSpellById((int) $server['spell_id']) : null;
        $realm = !empty($server['realms_id']) ? Realm::getById((int) $server['realms_id']) : null;
        $owner = !empty($server['owner_id']) ? User::getUserById((int) $server['owner_id']) : null;
        $node = !empty($server['node_id']) ? Node::getNodeById((int) $server['node_id']) : null;
        $ownerRole = ($owner && !empty($owner['role_id'])) ? Role::getById((int) $owner['role_id']) : null;

        $allocations = array_map(static function (array $row): array {
            return [
                'id' => isset($row['id']) ? (int) $row['id'] : null,
                'ip' => $row['ip'] ?? null,
                'ip_alias' => $row['ip_alias'] ?? null,
                'port' => isset($row['port']) ? (int) $row['port'] : null,
                'notes' => $row['notes'] ?? null,
                'is_primary' => false,
            ];
        }, Allocation::getByServerId($serverId));

        $primaryAllocationId = (int) ($server['allocation_id'] ?? 0);
        if ($primaryAllocationId > 0) {
            foreach (Allocation::getByServerId($serverId) as $i => $row) {
                if ((int) ($row['id'] ?? 0) === $primaryAllocationId && isset($allocations[$i])) {
                    $allocations[$i]['is_primary'] = true;
                }
            }
        }

        $firewall = [];
        try {
            $fwResponse = $wings->getServer()->getFirewallRules((string) $server['uuid']);
            if ($fwResponse->isSuccessful()) {
                $firewall = $fwResponse->getData() ?? [];
                if (isset($firewall['data']) && is_array($firewall['data'])) {
                    $firewall = $firewall['data'];
                }
            }
        } catch (\Throwable $e) {
            $firewall = ['_error' => $e->getMessage()];
        }

        $proxies = array_map(static function (array $proxy) use ($includeEncrypted): array {
            $row = [
                'domain' => $proxy['domain'] ?? null,
                'ip' => $proxy['ip'] ?? null,
                'port' => isset($proxy['port']) ? (int) $proxy['port'] : null,
                'ssl' => (bool) ($proxy['ssl'] ?? false),
                'use_lets_encrypt' => (bool) ($proxy['use_lets_encrypt'] ?? false),
                'client_email' => $proxy['client_email'] ?? null,
            ];
            if ($includeEncrypted) {
                $row['ssl_cert'] = $proxy['ssl_cert'] ?? null;
                $row['ssl_key'] = $proxy['ssl_key'] ?? null;
            } else {
                $row['ssl_cert'] = !empty($proxy['ssl_cert']) ? '[REDACTED]' : null;
                $row['ssl_key'] = !empty($proxy['ssl_key']) ? '[REDACTED]' : null;
            }

            return $row;
        }, Proxy::getByServerId($serverId));

        $schedules = [];
        foreach (ServerSchedule::getSchedulesByServerId($serverId) as $schedule) {
            $tasks = array_map(static function (array $task): array {
                return [
                    'sequence_id' => $task['sequence_id'] ?? null,
                    'action' => $task['action'] ?? null,
                    'payload' => $task['payload'] ?? null,
                    'time_offset' => $task['time_offset'] ?? 0,
                    'continue_on_failure' => (bool) ($task['continue_on_failure'] ?? false),
                ];
            }, Task::getTasksByScheduleId((int) $schedule['id']));

            $schedules[] = [
                'name' => $schedule['name'] ?? null,
                'cron_minute' => $schedule['cron_minute'] ?? '*',
                'cron_hour' => $schedule['cron_hour'] ?? '*',
                'cron_day_of_month' => $schedule['cron_day_of_month'] ?? '*',
                'cron_month' => $schedule['cron_month'] ?? '*',
                'cron_day_of_week' => $schedule['cron_day_of_week'] ?? '*',
                'timezone' => $schedule['timezone'] ?? 'UTC',
                'is_active' => (bool) ($schedule['is_active'] ?? false),
                'only_when_online' => (bool) ($schedule['only_when_online'] ?? false),
                'tasks' => $tasks,
            ];
        }

        $lifecycleHooks = [];
        foreach (ServerLifecycleHook::getHooksByServerId($serverId) as $hook) {
            $steps = array_map(static function (array $step): array {
                return [
                    'sequence_id' => $step['sequence_id'] ?? null,
                    'task_type' => $step['task_type'] ?? null,
                    'payload' => $step['payload'] ?? null,
                    'continue_on_failure' => (bool) ($step['continue_on_failure'] ?? false),
                ];
            }, ServerLifecycleHookStep::getStepsByHookId((int) $hook['id']));

            $lifecycleHooks[] = [
                'hook_type' => $hook['hook_type'] ?? null,
                'is_active' => (bool) ($hook['is_active'] ?? false),
                'steps' => $steps,
            ];
        }

        $userCache = [];
        $subusers = [];
        foreach (Subuser::getSubusersWithDetailsByServerId($serverId) as $row) {
            $permissions = $row['permissions'] ?? [];
            if (is_string($permissions)) {
                $decoded = json_decode($permissions, true);
                $permissions = is_array($decoded) ? $decoded : [];
            }

            $userId = isset($row['user_id']) ? (int) $row['user_id'] : 0;
            $user = self::cachedUser($userCache, $userId);
            $role = ($user && !empty($user['role_id'])) ? Role::getById((int) $user['role_id']) : null;

            $subusers[] = [
                'user_id' => $userId > 0 ? $userId : null,
                'username' => $user['username'] ?? ($row['username'] ?? null),
                'email' => $user['email'] ?? ($row['email'] ?? null),
                'first_name' => $user['first_name'] ?? ($row['first_name'] ?? null),
                'last_name' => $user['last_name'] ?? ($row['last_name'] ?? null),
                'avatar' => $user['avatar'] ?? null,
                'uuid' => $user['uuid'] ?? null,
                'role' => $role['name'] ?? null,
                'permissions' => $permissions,
            ];
        }

        $spellVariables = array_map(static function (array $row): array {
            return [
                'env_variable' => $row['env_variable'] ?? null,
                'name' => $row['name'] ?? null,
                'variable_value' => $row['variable_value'] ?? null,
            ];
        }, ServerVariable::getServerVariablesWithDetails($serverId));

        $customVariables = array_map(static function (array $row) use ($includeEncrypted): array {
            $isEncrypted = (int) ($row['is_encrypted'] ?? 0) === 1;
            $value = $row['variable_value'] ?? null;
            if ($isEncrypted && !$includeEncrypted) {
                $value = '[REDACTED]';
            }

            return [
                'name' => $row['name'] ?? null,
                'env_variable' => $row['env_variable'] ?? null,
                'variable_value' => $value,
                'is_encrypted' => $isEncrypted,
            ];
        }, ServerCustomVariable::getCustomVariablesByServerId($serverId, $includeEncrypted));

        $databases = [];
        foreach (ServerDatabase::getServerDatabasesWithDetailsByServerId($serverId) as $database) {
            $host = DatabaseInstance::getDatabaseById((int) $database['database_host_id']);
            $databases[] = [
                'database' => $database['database'] ?? null,
                'username' => $database['username'] ?? null,
                'password' => $includeEncrypted ? ($database['password'] ?? null) : '[REDACTED]',
                'remote' => $database['remote'] ?? '%',
                'max_connections' => isset($database['max_connections']) ? (int) $database['max_connections'] : 0,
                'database_type' => $database['database_type'] ?? null,
                'host' => [
                    'id' => $host['id'] ?? null,
                    'name' => $host['name'] ?? null,
                    'database_host' => $host['database_host'] ?? ($database['database_host'] ?? null),
                    'database_port' => $host['database_port'] ?? ($database['database_port'] ?? null),
                    'database_type' => $host['database_type'] ?? ($database['database_type'] ?? null),
                ],
            ];
        }

        $subdomains = array_map(static function (array $row): array {
            return [
                'subdomain' => $row['subdomain'] ?? ($row['domain'] ?? null),
                'domain' => $row['domain'] ?? null,
            ];
        }, Subdomain::getByServerId($serverId));

        $activities = [];
        if ($includeActivities) {
            $page = ServerActivity::getActivitiesWithPagination(1, 5000, '', $serverId);
            foreach (($page['data'] ?? []) as $row) {
                $userId = isset($row['user_id']) ? (int) $row['user_id'] : 0;
                $user = self::cachedUser($userCache, $userId);
                $roleName = $row['user']['role'] ?? null;
                if ($user && !empty($user['role_id']) && $roleName === null) {
                    $role = Role::getById((int) $user['role_id']);
                    $roleName = $role['name'] ?? null;
                }

                $metadata = $row['metadata'] ?? null;
                if (is_string($metadata) && $metadata !== '') {
                    $decoded = json_decode($metadata, true);
                    $metadata = $decoded !== null ? $decoded : $metadata;
                }

                $activities[] = [
                    'id' => isset($row['id']) ? (int) $row['id'] : null,
                    'event' => $row['event'] ?? null,
                    'metadata' => $metadata,
                    'ip' => $row['ip'] ?? null,
                    'timestamp' => $row['timestamp'] ?? null,
                    'user_id' => $userId > 0 ? $userId : null,
                    'node_id' => isset($row['node_id']) ? (int) $row['node_id'] : null,
                    'server_id' => isset($row['server_id']) ? (int) $row['server_id'] : $serverId,
                    'user' => $user ? [
                        'uuid' => $user['uuid'] ?? null,
                        'username' => $user['username'] ?? ($row['user']['username'] ?? null),
                        'email' => $user['email'] ?? null,
                        'first_name' => $user['first_name'] ?? null,
                        'last_name' => $user['last_name'] ?? null,
                        'avatar' => $user['avatar'] ?? AvatarHelper::resolveAvatar(
                            $row['user']['avatar'] ?? null,
                            (string) ($user['email'] ?? ($row['user']['username'] ?? 'user')),
                            $row['user']['username'] ?? null
                        ),
                        'role' => $roleName,
                    ] : ($row['user'] ?? null),
                ];
            }
        }

        return [
            'version' => 3,
            'exported_at' => gmdate('c'),
            'server_uuid' => (string) ($server['uuid'] ?? ''),
            'include_encrypted' => $includeEncrypted,
            'data' => [
                'server' => [
                    'id' => $serverId,
                    'external_id' => $server['external_id'] ?? null,
                    'uuid' => $server['uuid'] ?? null,
                    'uuidShort' => $server['uuidShort'] ?? null,
                    'name' => $server['name'] ?? null,
                    'description' => $server['description'] ?? null,
                    'status' => $server['status'] ?? null,
                    'suspended' => (bool) ($server['suspended'] ?? false),
                    'suspension_reason' => $server['suspension_reason'] ?? null,
                    'suspended_at' => $server['suspended_at'] ?? null,
                    'startup' => $server['startup'] ?? null,
                    'image' => $server['image'] ?? null,
                    'memory' => isset($server['memory']) ? (int) $server['memory'] : null,
                    'swap' => isset($server['swap']) ? (int) $server['swap'] : null,
                    'disk' => isset($server['disk']) ? (int) $server['disk'] : null,
                    'io' => isset($server['io']) ? (int) $server['io'] : null,
                    'cpu' => isset($server['cpu']) ? (int) $server['cpu'] : null,
                    'threads' => $server['threads'] ?? null,
                    'oom_disabled' => (bool) ($server['oom_disabled'] ?? false),
                    'allocation_limit' => isset($server['allocation_limit']) ? (int) $server['allocation_limit'] : null,
                    'database_limit' => isset($server['database_limit']) ? (int) $server['database_limit'] : null,
                    'backup_limit' => isset($server['backup_limit']) ? (int) $server['backup_limit'] : null,
                    'backup_retention_mode' => $server['backup_retention_mode'] ?? null,
                    'skip_scripts' => (bool) ($server['skip_scripts'] ?? false),
                    'skip_zerotrust' => (bool) ($server['skip_zerotrust'] ?? false),
                    'show_on_status' => (bool) ($server['show_on_status'] ?? false),
                    'fastdl_enabled' => (bool) ($server['fastdl_enabled'] ?? false),
                    'fastdl_directory' => $server['fastdl_directory'] ?? null,
                    'created_at' => $server['created_at'] ?? null,
                    'updated_at' => $server['updated_at'] ?? null,
                    'installed_at' => $server['installed_at'] ?? null,
                    'expires_at' => $server['expires_at'] ?? null,
                    'last_error' => $server['last_error'] ?? null,
                    'spell' => $spell ? [
                        'id' => (int) $spell['id'],
                        'name' => $spell['name'] ?? null,
                        'author' => $spell['author'] ?? null,
                        'description' => $spell['description'] ?? null,
                    ] : null,
                    'realm' => $realm ? [
                        'id' => (int) $realm['id'],
                        'name' => $realm['name'] ?? null,
                        'description' => $realm['description'] ?? null,
                    ] : null,
                    'node' => $node ? [
                        'id' => (int) $node['id'],
                        'name' => $node['name'] ?? null,
                        'fqdn' => $node['fqdn'] ?? null,
                        'scheme' => $node['scheme'] ?? null,
                        'location_id' => isset($node['location_id']) ? (int) $node['location_id'] : null,
                    ] : null,
                    'owner' => $owner ? [
                        'id' => isset($owner['id']) ? (int) $owner['id'] : null,
                        'uuid' => $owner['uuid'] ?? null,
                        'email' => $owner['email'] ?? null,
                        'username' => $owner['username'] ?? null,
                        'first_name' => $owner['first_name'] ?? null,
                        'last_name' => $owner['last_name'] ?? null,
                        'avatar' => $owner['avatar'] ?? null,
                        'role' => $ownerRole['name'] ?? null,
                        'role_id' => isset($owner['role_id']) ? (int) $owner['role_id'] : null,
                        'last_seen' => $owner['last_seen'] ?? null,
                    ] : null,
                ],
                'allocations' => $allocations,
                'firewall_rules' => $firewall,
                'proxies' => $proxies,
                'schedules' => $schedules,
                'lifecycle_hooks' => $lifecycleHooks,
                'subusers' => $subusers,
                'spell_variables' => $spellVariables,
                'custom_variables' => $customVariables,
                'databases' => $databases,
                'subdomains' => $subdomains,
                'activities' => $activities,
            ],
        ];
    }

    /**
     * Write metadata pack (JSON / Markdown / text / HTML) to the server filesystem via Wings.
     *
     * @return array{path: string, size_bytes: int, files: list<string>}
     */
    public static function writeToServer(Wings $wings, array $server, bool $includeEncrypted = false, bool $includeActivities = false): array
    {
        $pack = self::buildPack($server, $wings, $includeEncrypted, $includeActivities);
        $files = self::buildExportFiles($pack);
        $serverUuid = (string) $server['uuid'];
        $totalBytes = 0;
        $written = [];

        foreach ($files as $relativePath => $content) {
            $fullPath = rtrim(self::METADATA_DIRECTORY, '/') . '/' . ltrim($relativePath, '/');
            ServerDatabaseFilesystemBackupService::ensureServerDirectoryExists($wings, $serverUuid, $fullPath);
            $response = $wings->getServer()->writeFile($serverUuid, $fullPath, $content);
            if (!$response->isSuccessful()) {
                throw new \RuntimeException('Failed to write metadata file ' . $fullPath . ': ' . $response->getError());
            }
            $totalBytes += strlen($content);
            $written[] = $fullPath;
        }

        return [
            'path' => self::METADATA_DIRECTORY,
            'size_bytes' => $totalBytes,
            'files' => $written,
        ];
    }

    /**
     * @param array{version: int, exported_at: string, server_uuid: string, include_encrypted: bool, data: array<string, mixed>} $pack
     *
     * @return array<string, string> relative path => file contents
     */
    public static function buildExportFiles(array $pack): array
    {
        $data = $pack['data'] ?? [];
        $serverName = (string) (($data['server']['name'] ?? null) ?: 'Server');
        $exportedAt = (string) ($pack['exported_at'] ?? gmdate('c'));
        $uuid = (string) ($pack['server_uuid'] ?? '');

        $sections = [
            'server' => [
                'title' => 'Server',
                'icon' => 'server',
                'blurb' => 'Core identity, limits, node, spell, realm, and owner.',
                'payload' => $data['server'] ?? [],
            ],
            'allocations' => [
                'title' => 'Allocations',
                'icon' => 'network',
                'blurb' => 'IP / port bindings for this server.',
                'payload' => $data['allocations'] ?? [],
            ],
            'firewall' => [
                'title' => 'Firewall',
                'icon' => 'shield',
                'blurb' => 'Wings firewall rules snapshot.',
                'payload' => $data['firewall_rules'] ?? [],
            ],
            'proxies' => [
                'title' => 'Proxies',
                'icon' => 'globe',
                'blurb' => 'Reverse proxy domains and SSL settings.',
                'payload' => $data['proxies'] ?? [],
            ],
            'schedules' => [
                'title' => 'Schedules',
                'icon' => 'clock',
                'blurb' => 'Cron schedules and their tasks.',
                'payload' => $data['schedules'] ?? [],
            ],
            'lifecycle_hooks' => [
                'title' => 'Lifecycle hooks',
                'icon' => 'git-branch',
                'blurb' => 'Install / start / stop hook pipelines.',
                'payload' => $data['lifecycle_hooks'] ?? [],
            ],
            'subusers' => [
                'title' => 'Subusers',
                'icon' => 'users',
                'blurb' => 'Collaborators, avatars, and permission sets.',
                'payload' => $data['subusers'] ?? [],
            ],
            'spell_variables' => [
                'title' => 'Spell variables',
                'icon' => 'sparkles',
                'blurb' => 'Egg / spell environment variables.',
                'payload' => $data['spell_variables'] ?? [],
            ],
            'custom_variables' => [
                'title' => 'Custom variables',
                'icon' => 'puzzle',
                'blurb' => 'User-defined environment variables.',
                'payload' => $data['custom_variables'] ?? [],
            ],
            'databases' => [
                'title' => 'Databases',
                'icon' => 'database',
                'blurb' => 'Database credentials and host metadata.',
                'payload' => $data['databases'] ?? [],
            ],
            'subdomains' => [
                'title' => 'Subdomains',
                'icon' => 'link',
                'blurb' => 'DNS subdomain records.',
                'payload' => $data['subdomains'] ?? [],
            ],
            'activities' => [
                'title' => 'Activities',
                'icon' => 'activity',
                'blurb' => 'Activity log with users and avatars (when included).',
                'payload' => $data['activities'] ?? [],
            ],
        ];

        $files = [];
        $manifestSections = [];

        foreach ($sections as $slug => $meta) {
            $payload = $meta['payload'];
            $count = is_array($payload) ? (array_is_list($payload) ? count($payload) : 1) : 0;
            $json = self::encodeJson($payload);
            $md = self::renderMarkdownSection($meta['title'], $meta['blurb'], $payload, $exportedAt, $serverName);
            $txt = self::renderTextSection($meta['title'], $meta['blurb'], $payload, $exportedAt, $serverName);
            $html = self::renderHtmlDocument(
                $meta['title'] . ' · ' . $serverName,
                $meta['icon'],
                $meta['blurb'],
                $payload,
                $exportedAt,
                $serverName,
                $uuid,
                $slug,
                true,
                $pack
            );

            $files[$slug . '/' . $slug . '.json'] = $json;
            $files[$slug . '/' . $slug . '.md'] = $md;
            $files[$slug . '/' . $slug . '.txt'] = $txt;
            $files[$slug . '/' . $slug . '.html'] = $html;

            $manifestSections[] = [
                'slug' => $slug,
                'title' => $meta['title'],
                'icon' => $meta['icon'],
                'count' => $count,
                'files' => [
                    $slug . '/' . $slug . '.json',
                    $slug . '/' . $slug . '.md',
                    $slug . '/' . $slug . '.txt',
                    $slug . '/' . $slug . '.html',
                ],
            ];
        }

        $manifest = [
            'version' => (int) ($pack['version'] ?? 3),
            'exported_at' => $exportedAt,
            'server_uuid' => $uuid,
            'server_name' => $serverName,
            'include_encrypted' => !empty($pack['include_encrypted']),
            'formats' => ['json', 'md', 'txt', 'html'],
            'sections' => $manifestSections,
            'root_files' => [
                'README.md',
                'index.html',
                'manifest.json',
                'summary.txt',
                'full-pack.json',
            ],
        ];

        $files['full-pack.json'] = self::encodeJson($pack);
        $files['manifest.json'] = self::encodeJson($manifest);
        $files['summary.txt'] = self::renderSummaryText($pack, $sections);
        $files['README.md'] = self::renderReadme($pack, $sections);
        $files['index.html'] = self::renderIndexHtml($pack, $sections);

        return $files;
    }

    /**
     * @param array<int, array<string, mixed>|null> $cache
     */
    private static function cachedUser(array &$cache, int $userId): ?array
    {
        if ($userId <= 0) {
            return null;
        }
        if (!array_key_exists($userId, $cache)) {
            $cache[$userId] = User::getUserById($userId);
        }

        return $cache[$userId];
    }

    private static function encodeJson(mixed $value): string
    {
        $json = json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            throw new \RuntimeException('Failed to encode metadata as JSON');
        }

        return $json . "\n";
    }

    /**
     * @param array<string, array{title: string, icon: string, blurb: string, payload: mixed}> $sections
     */
    private static function renderSummaryText(array $pack, array $sections): string
    {
        $data = $pack['data']['server'] ?? [];
        $owner = is_array($data['owner'] ?? null) ? $data['owner'] : [];
        $lines = [
            'FeatherPanel metadata pack',
            str_repeat('=', 40),
            'Server: ' . (($data['name'] ?? null) ?: '(unnamed)'),
            'UUID: ' . ($pack['server_uuid'] ?? ''),
            'Exported: ' . ($pack['exported_at'] ?? ''),
            'Owner: ' . (($owner['username'] ?? null) ?: '(none)') . ' <' . (($owner['email'] ?? null) ?: '') . '>',
            'Encrypted secrets included: ' . (!empty($pack['include_encrypted']) ? 'yes' : 'no'),
            '',
            'Section counts',
            str_repeat('-', 40),
        ];

        foreach ($sections as $slug => $meta) {
            $payload = $meta['payload'];
            $count = is_array($payload) ? (array_is_list($payload) ? count($payload) : 1) : 0;
            $lines[] = sprintf('%-20s %d', $slug, $count);
        }

        $lines[] = '';
        $lines[] = 'Open index.html for the ui.';

        return implode("\n", $lines) . "\n";
    }

    /**
     * @param array<string, array{title: string, icon: string, blurb: string, payload: mixed}> $sections
     */
    private static function renderReadme(array $pack, array $sections): string
    {
        $name = (string) (($pack['data']['server']['name'] ?? null) ?: 'Server');
        $lines = [
            '# FeatherPanel backup metadata',
            '',
            'Pretty export pack for **' . $name . '**.',
            '',
            '- Exported at: `' . ($pack['exported_at'] ?? '') . '`',
            '- Server UUID: `' . ($pack['server_uuid'] ?? '') . '`',
            '- Encrypted secrets: ' . (!empty($pack['include_encrypted']) ? 'included' : 'redacted'),
            '',
            '## How to browse',
            '',
            '1. Open [`index.html`](index.html).',
            '2. Or peek at [`summary.txt`](summary.txt) / [`manifest.json`](manifest.json).',
            '3. Machine-readable restore source of truth: [`full-pack.json`](full-pack.json).',
            '',
            'Each section folder contains the same data as `.json`, `.md`, `.txt`, and `.html`.',
            '',
            '## Sections',
            '',
        ];

        foreach ($sections as $slug => $meta) {
            $payload = $meta['payload'];
            $count = is_array($payload) ? (array_is_list($payload) ? count($payload) : 1) : 0;
            $lines[] = sprintf(
                '- **[%s](%s/%s.html)** (`%s`) — %s (%d)',
                $meta['title'],
                $slug,
                $slug,
                $meta['icon'],
                $meta['blurb'],
                $count
            );
        }

        $lines[] = '';
        $lines[] = '_Generated by FeatherPanel · create/export only (restore coming later)._';
        $lines[] = '';

        return implode("\n", $lines);
    }

    /**
     * @param array<string, array{title: string, icon: string, blurb: string, payload: mixed}> $sections
     */
    private static function renderIndexHtml(array $pack, array $sections): string
    {
        $server = is_array($pack['data']['server'] ?? null) ? $pack['data']['server'] : [];
        $name = (string) (($server['name'] ?? null) ?: 'Server');
        $uuid = (string) ($pack['server_uuid'] ?? '');
        $exportedAt = (string) ($pack['exported_at'] ?? '');
        $owner = is_array($server['owner'] ?? null) ? $server['owner'] : [];
        $secrets = !empty($pack['include_encrypted']) ? 'included' : 'redacted';

        $rows = '';
        foreach ($sections as $slug => $meta) {
            $payload = $meta['payload'];
            $count = is_array($payload) ? (array_is_list($payload) ? count($payload) : 1) : 0;
            $base = $slug . '/' . $slug;
            $rows .= '<tr class="border-b border-[var(--line)] hover:bg-[var(--row-hover)]">'
                . '<td class="py-3 pr-3 align-middle">'
                . '<a href="' . self::e($base . '.html') . '" class="inline-flex items-center gap-2 font-medium text-[var(--ink)] hover:text-[var(--accent)]">'
                . '<i data-lucide="' . self::e($meta['icon']) . '" class="h-4 w-4 shrink-0 text-[var(--muted)]"></i>'
                . self::e($meta['title']) . '</a>'
                . '<div class="mt-0.5 pl-6 text-xs text-[var(--muted)]">' . self::e($meta['blurb']) . '</div></td>'
                . '<td class="py-3 px-2 align-middle text-right font-mono text-sm tabular-nums text-[var(--muted)]">' . self::e((string) $count) . '</td>'
                . '<td class="py-3 pl-2 align-middle text-right font-mono text-xs">'
                . '<a class="text-[var(--accent)] hover:underline" href="' . self::e($base . '.json') . '">json</a>'
                . '<span class="text-[var(--muted)]"> · </span>'
                . '<a class="text-[var(--accent)] hover:underline" href="' . self::e($base . '.md') . '">md</a>'
                . '<span class="text-[var(--muted)]"> · </span>'
                . '<a class="text-[var(--accent)] hover:underline" href="' . self::e($base . '.txt') . '">txt</a>'
                . '<span class="text-[var(--muted)]"> · </span>'
                . '<a class="text-[var(--accent)] hover:underline" href="' . self::e($base . '.html') . '">html</a>'
                . '</td></tr>';
        }

        $body = '<header class="border-b border-[var(--line)] pb-6">'
            . '<p class="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">FeatherPanel · metadata archive</p>'
            . '<div class="mt-3 flex flex-wrap items-end justify-between gap-4">'
            . '<div><h1 class="text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">' . self::e($name) . '</h1>'
            . '<p class="mt-2 max-w-xl text-sm text-[var(--muted)]">Panel settings export. Browse sections below or open the machine-readable pack.</p></div>'
            . self::htmlUserBadge($owner, 'Owner', true)
            . '</div>'
            . '<dl class="mt-5 grid gap-2 font-mono text-xs sm:grid-cols-3">'
            . '<div><dt class="text-[var(--muted)]">uuid</dt><dd class="mt-0.5 break-all text-[var(--ink)]">' . self::e($uuid) . '</dd></div>'
            . '<div><dt class="text-[var(--muted)]">exported</dt><dd class="mt-0.5 text-[var(--ink)]">' . self::e($exportedAt) . '</dd></div>'
            . '<div><dt class="text-[var(--muted)]">secrets</dt><dd class="mt-0.5 text-[var(--ink)]">' . self::e($secrets) . '</dd></div>'
            . '</dl></header>'
            . '<section class="mt-8">'
            . '<div class="mb-3 flex items-baseline justify-between gap-3">'
            . '<h2 class="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Sections</h2>'
            . '<p class="font-mono text-xs text-[var(--muted)]">' . self::e((string) count($sections)) . ' folders</p></div>'
            . '<div class="overflow-x-auto border border-[var(--line)] bg-[var(--panel)]">'
            . '<table class="w-full min-w-[640px] text-left">'
            . '<thead class="border-b border-[var(--line)] bg-[var(--panel-head)] font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">'
            . '<tr><th class="py-2.5 pl-4 pr-3 font-medium">Section</th><th class="px-2 py-2.5 text-right font-medium">Count</th><th class="py-2.5 pl-2 pr-4 text-right font-medium">Formats</th></tr>'
            . '</thead><tbody class="px-4">' . $rows . '</tbody></table></div></section>'
            . '<footer class="mt-8 flex flex-wrap gap-x-4 gap-y-2 border-t border-[var(--line)] pt-5 font-mono text-xs text-[var(--muted)]">'
            . '<a class="text-[var(--accent)] hover:underline" href="README.md">README.md</a>'
            . '<a class="text-[var(--accent)] hover:underline" href="summary.txt">summary.txt</a>'
            . '<a class="text-[var(--accent)] hover:underline" href="manifest.json">manifest.json</a>'
            . '<a class="text-[var(--accent)] hover:underline" href="full-pack.json">full-pack.json</a>'
            . '</footer>';

        return self::wrapHtml('Metadata · ' . $name, $body, false);
    }

    private static function renderMarkdownSection(string $title, string $blurb, mixed $payload, string $exportedAt, string $serverName): string
    {
        $lines = [
            '# ' . $title,
            '',
            '>' . $blurb,
            '',
            '- Server: **' . $serverName . '**',
            '- Exported: `' . $exportedAt . '`',
            '',
        ];

        if (!is_array($payload) || $payload === []) {
            $lines[] = '_No data in this section._';
            $lines[] = '';

            return implode("\n", $lines);
        }

        if (array_is_list($payload)) {
            foreach ($payload as $i => $row) {
                $lines[] = '## Item ' . ((int) $i + 1);
                $lines[] = '';
                $lines = array_merge($lines, self::markdownKeyValues(is_array($row) ? $row : ['value' => $row]));
                $lines[] = '';
            }
        } else {
            $lines = array_merge($lines, self::markdownKeyValues($payload));
            $lines[] = '';
        }

        return implode("\n", $lines);
    }

    /**
     * @param array<string|int, mixed> $row
     *
     * @return list<string>
     */
    private static function markdownKeyValues(array $row, int $depth = 0): array
    {
        $lines = [];
        $pad = str_repeat('  ', $depth);
        foreach ($row as $key => $value) {
            $label = (string) $key;
            if (is_array($value)) {
                $lines[] = $pad . '- **' . $label . '**';
                $lines = array_merge($lines, self::markdownKeyValues($value, $depth + 1));
            } else {
                $lines[] = $pad . '- **' . $label . '**: `' . self::scalarToString($value) . '`';
            }
        }

        return $lines;
    }

    private static function renderTextSection(string $title, string $blurb, mixed $payload, string $exportedAt, string $serverName): string
    {
        $lines = [
            $title,
            str_repeat('=', max(8, strlen($title))),
            $blurb,
            '',
            'Server: ' . $serverName,
            'Exported: ' . $exportedAt,
            '',
        ];

        if (!is_array($payload) || $payload === []) {
            $lines[] = '(no data)';

            return implode("\n", $lines) . "\n";
        }

        if (array_is_list($payload)) {
            foreach ($payload as $i => $row) {
                $lines[] = '--- Item ' . ((int) $i + 1) . ' ---';
                $lines = array_merge($lines, self::textKeyValues(is_array($row) ? $row : ['value' => $row]));
                $lines[] = '';
            }
        } else {
            $lines = array_merge($lines, self::textKeyValues($payload));
        }

        return implode("\n", $lines) . "\n";
    }

    /**
     * @param array<string|int, mixed> $row
     *
     * @return list<string>
     */
    private static function textKeyValues(array $row, string $prefix = ''): array
    {
        $lines = [];
        foreach ($row as $key => $value) {
            $path = $prefix === '' ? (string) $key : $prefix . '.' . $key;
            if (is_array($value)) {
                if ($value === []) {
                    $lines[] = $path . ': []';
                } else {
                    $lines = array_merge($lines, self::textKeyValues($value, $path));
                }
            } else {
                $lines[] = $path . ': ' . self::scalarToString($value);
            }
        }

        return $lines;
    }

    private static function renderHtmlDocument(
        string $pageTitle,
        string $icon,
        string $blurb,
        mixed $payload,
        string $exportedAt,
        string $serverName,
        string $uuid,
        string $slug,
        bool $withBackLink,
        array $pack,
    ): string {
        $owner = is_array($pack['data']['server']['owner'] ?? null) ? $pack['data']['server']['owner'] : [];
        $content = '<header class="border-b border-[var(--line)] pb-5">'
            . ($withBackLink
                ? '<a href="../index.html" class="mb-4 inline-flex items-center gap-1.5 font-mono text-xs text-[var(--accent)] hover:underline">'
                . '<i data-lucide="arrow-left" class="h-3.5 w-3.5"></i> index</a>'
                : '')
            . '<div class="flex flex-wrap items-start justify-between gap-4">'
            . '<div>'
            . '<p class="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">'
            . '<i data-lucide="' . self::e($icon) . '" class="h-3.5 w-3.5"></i>' . self::e($slug) . '</p>'
            . '<h1 class="mt-2 text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl">' . self::e($pageTitle) . '</h1>'
            . '<p class="mt-2 max-w-2xl text-sm text-[var(--muted)]">' . self::e($blurb) . '</p>'
            . '<dl class="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs">'
            . '<div><dt class="text-[var(--muted)]">server</dt><dd class="text-[var(--ink)]">' . self::e($serverName) . '</dd></div>'
            . '<div><dt class="text-[var(--muted)]">exported</dt><dd class="text-[var(--ink)]">' . self::e($exportedAt) . '</dd></div>'
            . '</dl></div>'
            . self::htmlUserBadge($owner, 'Owner', true)
            . '</div></header>'
            . '<div class="mt-6 space-y-3">' . self::htmlPayload($payload, $slug) . '</div>'
            . '<footer class="mt-8 border-t border-[var(--line)] pt-4 font-mono text-xs text-[var(--muted)]">uuid ' . self::e($uuid) . '</footer>';

        return self::wrapHtml($pageTitle, $content, true);
    }

    private static function htmlPayload(mixed $payload, string $slug = ''): string
    {
        if (!is_array($payload) || $payload === []) {
            return '<div class="border border-dashed border-[var(--line)] bg-[var(--panel)] px-5 py-10 text-center text-sm text-[var(--muted)]">'
                . 'No data in this section.</div>';
        }

        if ($slug === 'server' && !array_is_list($payload)) {
            return self::htmlServerCard($payload);
        }

        if (!array_is_list($payload)) {
            return '<article class="border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">'
                . self::htmlKeyValues($payload)
                . '</article>';
        }

        $html = '';
        foreach ($payload as $i => $row) {
            $row = is_array($row) ? $row : ['value' => $row];
            if ($slug === 'activities') {
                $html .= self::htmlActivityCard($row, (int) $i + 1);
            } elseif ($slug === 'subusers') {
                $html .= self::htmlSubuserCard($row, (int) $i + 1);
            } else {
                $html .= '<article class="border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">'
                    . '<div class="mb-3 flex items-center justify-between gap-3 border-b border-[var(--line)] pb-2">'
                    . '<h2 class="text-sm font-semibold text-[var(--ink)]">Item ' . ((int) $i + 1) . '</h2>'
                    . '<span class="font-mono text-xs text-[var(--muted)]">#' . ((int) $i + 1) . '</span>'
                    . '</div>'
                    . self::htmlKeyValues($row)
                    . '</article>';
            }
        }

        return $html;
    }

    /**
     * @param array<string, mixed> $server
     */
    private static function htmlServerCard(array $server): string
    {
        $owner = is_array($server['owner'] ?? null) ? $server['owner'] : [];
        $limits = [
            'memory' => $server['memory'] ?? null,
            'swap' => $server['swap'] ?? null,
            'disk' => $server['disk'] ?? null,
            'cpu' => $server['cpu'] ?? null,
            'io' => $server['io'] ?? null,
            'threads' => $server['threads'] ?? null,
        ];

        $html = '<div class="grid gap-3 lg:grid-cols-3">'
            . '<article class="border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5 lg:col-span-2">'
            . '<h2 class="mb-3 border-b border-[var(--line)] pb-2 text-sm font-semibold text-[var(--ink)]">Identity</h2>'
            . self::htmlKeyValues(array_diff_key($server, array_flip(['owner', 'spell', 'realm', 'node'])))
            . '</article>'
            . '<div class="space-y-3">'
            . '<article class="border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">'
            . '<h2 class="mb-3 border-b border-[var(--line)] pb-2 text-sm font-semibold text-[var(--ink)]">Owner</h2>'
            . self::htmlUserBadge($owner, 'Owner', true)
            . '<div class="mt-3">' . self::htmlKeyValues($owner) . '</div>'
            . '</article>'
            . '<article class="border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">'
            . '<h2 class="mb-3 border-b border-[var(--line)] pb-2 text-sm font-semibold text-[var(--ink)]">Limits</h2>'
            . self::htmlKeyValues($limits)
            . '</article>'
            . '</div></div>';

        foreach (['node' => 'Node', 'spell' => 'Spell', 'realm' => 'Realm'] as $key => $label) {
            if (!empty($server[$key]) && is_array($server[$key])) {
                $html .= '<article class="border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">'
                    . '<h2 class="mb-3 border-b border-[var(--line)] pb-2 text-sm font-semibold text-[var(--ink)]">' . self::e($label) . '</h2>'
                    . self::htmlKeyValues($server[$key])
                    . '</article>';
            }
        }

        return $html;
    }

    /**
     * @param array<string, mixed> $row
     */
    private static function htmlActivityCard(array $row, int $index): string
    {
        $user = is_array($row['user'] ?? null) ? $row['user'] : [];
        $event = (string) ($row['event'] ?? 'event');
        $meta = $row['metadata'] ?? null;
        $rest = $row;
        unset($rest['user'], $rest['event'], $rest['metadata'], $rest['timestamp'], $rest['ip']);

        return '<article class="border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">'
            . '<div class="flex flex-wrap items-start justify-between gap-4">'
            . self::htmlUserBadge($user, 'Actor', true)
            . '<div class="text-right">'
            . '<p class="font-mono text-sm font-medium text-[var(--ink)]">' . self::e($event) . '</p>'
            . '<p class="mt-1 font-mono text-xs text-[var(--muted)]">#' . $index . '</p>'
            . '</div></div>'
            . '<div class="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 sm:grid-cols-2">'
            . '<div><p class="font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">timestamp</p>'
            . '<p class="mt-1 font-mono text-sm text-[var(--ink)]">' . self::e((string) ($row['timestamp'] ?? '—')) . '</p></div>'
            . '<div><p class="font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">ip</p>'
            . '<p class="mt-1 font-mono text-sm text-[var(--ink)]">' . self::e((string) ($row['ip'] ?? '—')) . '</p></div>'
            . '</div>'
            . '<div class="mt-4">'
            . '<p class="mb-2 font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">metadata</p>'
            . self::htmlPrettyValue($meta)
            . '</div>'
            . ($rest !== [] ? '<div class="mt-4 border-t border-[var(--line)] pt-4">' . self::htmlKeyValues($rest) . '</div>' : '')
            . '</article>';
    }

    /**
     * @param array<string, mixed> $row
     */
    private static function htmlSubuserCard(array $row, int $index): string
    {
        $user = [
            'username' => $row['username'] ?? null,
            'email' => $row['email'] ?? null,
            'avatar' => $row['avatar'] ?? null,
            'first_name' => $row['first_name'] ?? null,
            'last_name' => $row['last_name'] ?? null,
            'role' => $row['role'] ?? null,
            'uuid' => $row['uuid'] ?? null,
        ];
        $rest = $row;
        unset($rest['username'], $rest['email'], $rest['avatar'], $rest['first_name'], $rest['last_name'], $rest['role'], $rest['uuid']);

        return '<article class="border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">'
            . '<div class="mb-4">' . self::htmlUserBadge($user, 'Subuser #' . $index, true) . '</div>'
            . self::htmlKeyValues($rest)
            . '</article>';
    }

    /**
     * @param array<string|int, mixed> $row
     */
    private static function htmlKeyValues(array $row): string
    {
        if ($row === []) {
            return '<p class="text-sm text-[var(--muted)]">Empty object.</p>';
        }

        $html = '<dl class="divide-y divide-[var(--line)]">';
        foreach ($row as $key => $value) {
            $label = (string) $key;
            $html .= '<div class="grid gap-1 py-2.5 sm:grid-cols-[11rem_1fr] sm:gap-4">'
                . '<dt class="font-mono text-xs text-[var(--muted)]">' . self::e($label) . '</dt>'
                . '<dd class="min-w-0">' . self::htmlValue($label, $value) . '</dd></div>';
        }

        return $html . '</dl>';
    }

    private static function htmlValue(string $key, mixed $value): string
    {
        if ($key === 'avatar' && is_string($value) && $value !== '') {
            return '<img src="' . self::e($value) . '" alt="avatar" class="h-11 w-11 rounded object-cover" loading="lazy" />'
                . '<p class="mt-2 break-all font-mono text-[11px] text-[var(--muted)]">' . self::e($value) . '</p>';
        }

        if ($key === 'user' && is_array($value)) {
            return self::htmlUserBadge($value, 'User', true) . '<div class="mt-3">' . self::htmlKeyValues($value) . '</div>';
        }

        if (is_array($value)) {
            if ($value === []) {
                return '<code class="font-mono text-xs text-[var(--muted)]">[]</code>';
            }
            if ($key === 'metadata' || $key === 'permissions' || $key === 'tasks' || $key === 'steps') {
                return self::htmlPrettyValue($value);
            }

            return '<div class="border border-[var(--line)] bg-[var(--panel-inset)] p-3">'
                . self::htmlKeyValues($value) . '</div>';
        }

        return self::htmlPrettyValue($value);
    }

    private static function htmlPrettyValue(mixed $value): string
    {
        if (is_array($value)) {
            $json = json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            if ($json === false) {
                $json = '[unprintable]';
            }

            return '<pre class="overflow-x-auto border border-[var(--line)] bg-[var(--code-bg)] p-3 font-mono text-[12px] leading-relaxed text-[var(--code-fg)]"><code>'
                . self::e($json) . '</code></pre>';
        }

        $text = self::scalarToString($value);

        return '<code class="inline-block max-w-full break-all border border-[var(--line)] bg-[var(--panel-inset)] px-2 py-0.5 font-mono text-[13px] text-[var(--ink)]">'
            . self::e($text) . '</code>';
    }

    /**
     * @param array<string, mixed> $user
     */
    private static function htmlUserBadge(array $user, string $label = 'User', bool $large = false): string
    {
        if ($user === []) {
            return '<div class="border border-dashed border-[var(--line)] px-3 py-2 text-sm text-[var(--muted)]">No user</div>';
        }

        $name = trim((string) (($user['username'] ?? null) ?: 'Unknown'));
        $full = trim(((string) ($user['first_name'] ?? '')) . ' ' . ((string) ($user['last_name'] ?? '')));
        $email = (string) ($user['email'] ?? '');
        $role = (string) ($user['role'] ?? '');
        $avatar = (string) ($user['avatar'] ?? '');
        $size = $large ? 'h-11 w-11' : 'h-9 w-9';

        $img = $avatar !== ''
            ? '<img src="' . self::e($avatar) . '" alt="" class="' . $size . ' rounded object-cover" loading="lazy" />'
            : '<div class="' . $size . ' flex items-center justify-center rounded bg-[var(--panel-inset)] text-[var(--muted)]"><i data-lucide="user" class="h-4 w-4"></i></div>';

        return '<div class="flex items-center gap-3 border border-[var(--line)] bg-[var(--panel)] px-3 py-2">'
            . $img
            . '<div class="min-w-0">'
            . '<p class="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">' . self::e($label) . '</p>'
            . '<p class="truncate text-sm font-semibold text-[var(--ink)]">' . self::e($name) . '</p>'
            . ($full !== '' ? '<p class="truncate text-xs text-[var(--muted)]">' . self::e($full) . '</p>' : '')
            . ($email !== '' ? '<p class="truncate font-mono text-[11px] text-[var(--muted)]">' . self::e($email) . '</p>' : '')
            . ($role !== '' ? '<p class="mt-0.5 font-mono text-[11px] text-[var(--accent)]">' . self::e($role) . '</p>' : '')
            . '</div></div>';
    }

    private static function wrapHtml(string $title, string $body, bool $nested): string
    {
        $script = <<<'JS'
(function () {
  const root = document.documentElement;
  const stored = localStorage.getItem('fp-meta-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');
  root.classList.toggle('dark', initial === 'dark');
  function sync() {
    const dark = root.classList.contains('dark');
    const label = document.getElementById('theme-label');
    if (label) label.textContent = dark ? 'Dark' : 'Light';
  }
  sync();
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    root.classList.toggle('dark');
    localStorage.setItem('fp-meta-theme', root.classList.contains('dark') ? 'dark' : 'light');
    sync();
  });
  if (window.lucide) window.lucide.createIcons();
})();
JS;

        $css = <<<'CSS'
:root {
  --ink: #1c241f;
  --muted: #66706a;
  --accent: #0f6b4c;
  --line: #d5dbd6;
  --panel: #ffffff;
  --panel-head: #f3f5f3;
  --panel-inset: #f6f7f5;
  --row-hover: #f0f3f0;
  --code-bg: #161b18;
  --code-fg: #d7e0d9;
  --page: #e9ece8;
  --grid: rgba(28, 36, 31, 0.045);
}
.dark {
  --ink: #e8eee9;
  --muted: #8b968f;
  --accent: #6dba95;
  --line: #2a322d;
  --panel: #171c19;
  --panel-head: #141914;
  --panel-inset: #121612;
  --row-hover: #1c221e;
  --code-bg: #0d100e;
  --code-fg: #c9d4cc;
  --page: #101411;
  --grid: rgba(232, 238, 233, 0.035);
}
html, body { min-height: 100%; }
body {
  margin: 0;
  color: var(--ink);
  background-color: var(--page);
  background-image:
    linear-gradient(to right, var(--grid) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid) 1px, transparent 1px);
  background-size: 28px 28px;
  font-family: "Source Sans 3", "Segoe UI", sans-serif;
}
.font-mono, code, pre, kbd { font-family: "Source Code Pro", ui-monospace, monospace; }
.shell { width: min(960px, calc(100% - 2rem)); margin: 0 auto; padding: 2rem 0 3rem; }
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.75rem; }
.theme-btn {
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink);
  font: inherit;
  font-size: 0.8125rem;
  padding: 0.4rem 0.7rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.theme-btn:hover { border-color: var(--accent); }
tbody tr > td:first-child { padding-left: 1rem; }
tbody tr > td:last-child { padding-right: 1rem; }
CSS;

        return '<!DOCTYPE html>' . "\n"
            . '<html lang="en" class="h-full">' . "\n"
            . '<head>' . "\n"
            . '<meta charset="utf-8">' . "\n"
            . '<meta name="viewport" content="width=device-width, initial-scale=1">' . "\n"
            . '<title>' . self::e($title) . '</title>' . "\n"
            . '<script src="https://cdn.tailwindcss.com"></script>' . "\n"
            . '<script>tailwind.config={darkMode:"class"}</script>' . "\n"
            . '<link rel="preconnect" href="https://fonts.googleapis.com">' . "\n"
            . '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' . "\n"
            . '<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Source+Code+Pro:wght@400;500;600&display=swap" rel="stylesheet">' . "\n"
            . '<style>' . $css . '</style>' . "\n"
            . '<script src="https://unpkg.com/lucide@latest"></script>' . "\n"
            . '</head>' . "\n"
            . '<body>' . "\n"
            . '<div class="shell">' . "\n"
            . '<div class="topbar">'
            . '<p class="m-0 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">FeatherPanel archive</p>'
            . '<button id="theme-toggle" type="button" class="theme-btn">'
            . '<i data-lucide="moon" class="h-3.5 w-3.5 dark:hidden"></i>'
            . '<i data-lucide="sun" class="hidden h-3.5 w-3.5 dark:block"></i>'
            . '<span id="theme-label">Light</span></button></div>' . "\n"
            . $body . "\n"
            . '</div>' . "\n"
            . '<script>' . $script . '</script>' . "\n"
            . '</body>' . "\n"
            . '</html>' . "\n";
    }

    private static function scalarToString(mixed $value): string
    {
        if ($value === null) {
            return 'null';
        }
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if (is_scalar($value)) {
            return (string) $value;
        }

        $json = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        return $json === false ? '[unprintable]' : $json;
    }

    private static function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
