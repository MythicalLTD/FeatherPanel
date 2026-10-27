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
use App\Realtime\Mercure;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use App\Helpers\DaemonCapabilities;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Read-only runtime facts for the developer debug console (##icanhasfeatherpanel).
 * Never returns secrets: only versions, flags, counts and on/off states.
 */
class DebugRuntimeController
{
    public function index(Request $request): Response
    {
        $config = App::getInstance(true)->getConfig();

        $nodes = [];
        try {
            foreach (Node::getAllNodes() as $node) {
                $caps = DaemonCapabilities::fromNode($node);
                $nodes[] = [
                    'id' => (int) $node['id'],
                    'name' => (string) $node['name'],
                    'daemon_type' => $caps->getType(),
                    'features' => $caps->features(),
                ];
            }
        } catch (\Throwable) {
            $nodes = [];
        }

        $isFranken = function_exists('frankenphp_handle_request');
        $env = static fn (string $key): ?string => ($v = getenv($key)) === false || $v === '' ? null : (string) $v;

        $flags = [];
        foreach (
            [
                'app_developer_mode',
                'module_game_enabled',
                'module_web_enabled',
                'module_vds_enabled',
                'ticket_system_enabled',
                'knowledgebase_enabled',
                'status_page_enabled',
                'registration_enabled',
                'maintenance_mode_enabled',
                'turnstile_enabled',
                'smtp_enabled',
            ] as $key
        ) {
            $flags[$key] = $config->getSetting($key, null);
        }

        $commit = $env('FEATHERPANEL_COMMIT') ?? $env('GIT_COMMIT') ?? $env('SOURCE_COMMIT');
        $headFile = dirname(__DIR__, 4) . '/.git/HEAD';
        if ($commit === null && is_readable($headFile)) {
            $head = trim((string) @file_get_contents($headFile));
            if (str_starts_with($head, 'ref: ')) {
                $refFile = dirname($headFile) . '/' . substr($head, 5);
                $head = is_readable($refFile) ? trim((string) @file_get_contents($refFile)) : '';
            }
            $commit = $head !== '' ? substr($head, 0, 12) : null;
        }

        return ApiResponse::success([
            'build' => [
                'version' => defined('APP_VERSION') ? (string) APP_VERSION : null,
                'upstream' => defined('APP_UPSTREAM') ? (string) APP_UPSTREAM : null,
                'commit' => $commit,
                'debug' => defined('APP_DEBUG') ? (bool) APP_DEBUG : false,
            ],
            'php' => [
                'version' => PHP_VERSION,
                'sapi' => PHP_SAPI,
                'memory_limit' => (string) ini_get('memory_limit'),
                'memory_usage' => memory_get_usage(true),
                'memory_peak' => memory_get_peak_usage(true),
                'opcache' => function_exists('opcache_get_status') && is_array(@opcache_get_status(false)),
                'extensions' => count(get_loaded_extensions()),
                'pid' => getmypid() ?: null,
            ],
            'frankenphp' => [
                'active' => $isFranken,
                'max_threads' => $env('FRANKENPHP_MAX_THREADS'),
                'workers' => $env('FEATHERPANEL_WORKERS'),
                'worker_max_threads' => $env('FEATHERPANEL_WORKER_MAX_THREADS'),
                'worker_max_memory' => $env('FEATHERPANEL_WORKER_MAX_MEMORY'),
                'worker_max_requests' => $env('FEATHERPANEL_WORKER_MAX_REQUESTS'),
            ],
            'mercure' => [
                'enabled' => Mercure::isEnabled(),
                'public_url' => Mercure::isEnabled() ? Mercure::publicUrl() : null,
            ],
            'flags' => $flags,
            'setup_completed' => $config->getSetting(ConfigInterface::SETUP_COMPLETED, null),
            'nodes' => $nodes,
        ], 'Debug runtime info', 200);
    }
}
