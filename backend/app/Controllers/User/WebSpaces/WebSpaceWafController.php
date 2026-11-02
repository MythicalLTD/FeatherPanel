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

namespace App\Controllers\User\WebSpaces;

use App\Chat\WebNode;
use App\Chat\WebSpace;
use App\Helpers\ApiResponse;
use App\Helpers\WebSpaceGateway;
use App\Helpers\FeatherQuilldClient;
use App\Helpers\WebSpaceDaemonSync;
use App\WebSpaceSubuserPermissions;
use App\Helpers\WebSpaceActivityLogger;
use App\Helpers\WebSpacePathValidator;
use App\Helpers\WebSpaceWafSettings;
use App\Helpers\CheckWebSpacePermission;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Per-WebSpace layer-7 firewall: settings, mode and the error-page finder.
 *
 * Statistics (overview/events) are empty until the node reports them; the dashboard
 * still works against these endpoints in the meantime.
 */
class WebSpaceWafController
{
    private const MAX_PAGE_BYTES = WebSpaceWafSettings::MAX_HTML_BYTES;
    private const MAX_PAGES = 10;
    private const RANGE_SECONDS = ['24h' => 3600, '7d' => 21600, '30d' => 86400];

    public function getSettings(Request $request, string $uuidShort): Response
    {
        $ctx = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SETTINGS_READ);
        if ($ctx instanceof Response) {
            return $ctx;
        }

        return ApiResponse::success($this->effective($ctx['space']), 'OK', 200);
    }

    public function updateSettings(Request $request, string $uuidShort): Response
    {
        $ctx = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SETTINGS_UPDATE);
        if ($ctx instanceof Response) {
            return $ctx;
        }

        $patch = json_decode($request->getContent(), true);
        if (!is_array($patch) || $patch === [] || array_is_list($patch)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        return $this->save($ctx, $patch, array_keys($patch));
    }

    public function updateMode(Request $request, string $uuidShort): Response
    {
        $ctx = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SETTINGS_UPDATE);
        if ($ctx instanceof Response) {
            return $ctx;
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body) || !is_string($body['mode'] ?? null)) {
            return ApiResponse::error('mode is required', 'INVALID_JSON', 400);
        }

        return $this->save($ctx, ['mode' => $body['mode']], ['mode']);
    }

    public function overview(Request $request, string $uuidShort): Response
    {
        $ctx = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SETTINGS_READ);
        if ($ctx instanceof Response) {
            return $ctx;
        }

        $range = $this->range($request);
        $mode = (string) $this->effective($ctx['space'])['mode'];
        $stats = $this->stats($ctx, $range, 1);
        $overview = is_array($stats['overview'] ?? null) ? $stats['overview'] : $this->emptyOverview($range);
        if (!is_array($stats['overview'] ?? null)) {
            // Not "engine missing": the node did not answer with numbers at all.
            $overview['daemon_unreachable'] = true;
        }

        return ApiResponse::success(['mode' => $mode] + $overview, 'OK', 200);
    }

    public function events(Request $request, string $uuidShort): Response
    {
        $ctx = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SETTINGS_READ);
        if ($ctx instanceof Response) {
            return $ctx;
        }

        $limit = max(1, min(200, (int) $request->query->get('limit', 50)));
        $stats = $this->stats($ctx, $this->range($request), $limit);
        $events = is_array($stats['events'] ?? null) ? array_values($stats['events']) : [];

        return ApiResponse::success(['events' => $events], 'OK', 200);
    }

    private function range(Request $request): string
    {
        $range = (string) $request->query->get('range', '24h');

        return isset(self::RANGE_SECONDS[$range]) ? $range : '24h';
    }

    /**
     * The daemon does the counting (it owns the access and audit logs). A node that does not know the endpoint yet,
     * or is unreachable, yields no numbers rather than an error page.
     *
     * @param array{space: array<string, mixed>, webNode: array<string, mixed>, user: array<string, mixed>} $ctx
     *
     * @return array<string, mixed>
     */
    private function stats(array $ctx, string $range, int $events): array
    {
        $daemon = FeatherQuilldClient::getWebSpaceWafStats($ctx['webNode'], (string) $ctx['space']['uuid'], $range, $events);
        if (!$daemon['ok'] || !is_array($daemon['body'])) {
            return [];
        }
        $body = $daemon['body'];

        return isset($body['data']) && is_array($body['data']) ? $body['data'] : $body;
    }

    /** @return array<string, mixed> */
    private function emptyOverview(string $range): array
    {
        return [
            'engine_available' => false,
            'bucket_seconds' => self::RANGE_SECONDS[$range],
            'totals' => [
                'requests' => 0, 'blocked' => 0, 'detected' => 0, 'unique_ips' => 0,
                'blocked_ips' => 0, 'status_4xx' => 0, 'status_5xx' => 0,
            ],
            'series' => [],
            'status_codes' => [],
            'top_ips' => [],
            'top_categories' => [],
            'top_paths' => [],
            'top_hosts' => [],
            'referrers' => [],
            'browsers' => [],
            'systems' => [],
        ];
    }

    /**
     * Look for error pages the customer already has (403.html, error/403.html, ErrorDocument lines)
     * so they can be reused as the block page. Reads only through the daemon's file API, which
     * confines every path to this WebSpace.
     */
    public function errorPages(Request $request, string $uuidShort): Response
    {
        $ctx = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SETTINGS_READ);
        if ($ctx instanceof Response) {
            return $ctx;
        }
        $denied = CheckWebSpacePermission::requireAny($request, $ctx['space'], [WebSpaceSubuserPermissions::FILE_READ_CONTENT, WebSpaceSubuserPermissions::FILE_READ]);
        if ($denied instanceof Response) {
            return $denied;
        }

        $webNode = $ctx['webNode'];
        $uuid = (string) $ctx['space']['uuid'];
        $docRoot = '/' . trim((string) ($ctx['space']['document_root'] ?? ''), '/');

        // path => status|null
        $candidates = [];
        $dirs = ['/'];
        foreach (['error', 'errors', 'error_pages', 'errorpages'] as $sub) {
            $dirs[] = '/' . $sub;
        }
        if ($docRoot !== '/' && WebSpaceWafSettings::isValidPath($docRoot)) {
            $dirs[] = $docRoot;
            foreach (['error', 'errors'] as $sub) {
                $dirs[] = $docRoot . '/' . $sub;
            }
        }
        $dirs = array_slice(array_values(array_unique($dirs)), 0, 8);

        foreach ($dirs as $dir) {
            $list = FeatherQuilldClient::listWebSpaceFiles($webNode, $uuid, ['directory' => $dir, 'per_page' => 250]);
            if (!$list['ok']) {
                continue;
            }
            foreach (self::entries($list['body']) as $entry) {
                $name = (string) ($entry['name'] ?? '');
                $isDir = !empty($entry['directory']) || (isset($entry['file']) && empty($entry['file']));
                if ($isDir || !empty($entry['symlink']) || !WebSpacePathValidator::isSafeFilename($name)) {
                    continue;
                }
                if (preg_match('/^(?:(40[0-9]|429|50[0-9])|(?:error|forbidden|denied|blocked|access[-_]denied))[^\/]*\.html?$/i', $name, $m) !== 1) {
                    continue;
                }
                $size = (int) ($entry['size'] ?? 0);
                if ($size > self::MAX_PAGE_BYTES) {
                    continue;
                }
                $path = rtrim($dir, '/') . '/' . $name;
                $candidates[$path] ??= isset($m[1]) && $m[1] !== '' ? (int) $m[1] : null;
            }
        }

        // ErrorDocument targets are relative to the document root, so only that root's .htaccess counts.
        $htaccess = $docRoot === '/' ? '/.htaccess' : $docRoot . '/.htaccess';
        foreach ($this->errorDocuments($webNode, $uuid, [$htaccess]) as $path => $status) {
            $candidates[$path] = $status;
        }

        $pages = [];
        foreach ($candidates as $path => $status) {
            if (count($pages) >= self::MAX_PAGES) {
                break;
            }
            $read = FeatherQuilldClient::getWebSpaceFileContents($webNode, $uuid, ltrim($path, '/'));
            if (!$read['ok']) {
                continue;
            }
            $html = self::contentsString($read['body']);
            if ($html === '' || strlen($html) > self::MAX_PAGE_BYTES || !mb_check_encoding($html, 'UTF-8') || str_contains($html, "\0")) {
                continue;
            }
            $pages[] = ['path' => $path, 'status' => $status, 'size' => strlen($html), 'html' => $html];
        }

        return ApiResponse::success(['pages' => $pages], 'OK', 200);
    }

    /**
     * @param array{space: array<string, mixed>, webNode: array<string, mixed>, user: array<string, mixed>} $ctx
     * @param array<string, mixed> $patch
     * @param list<string> $changed
     */
    private function save(array $ctx, array $patch, array $changed): Response
    {
        $space = $ctx['space'];
        $current = $this->effective($space);
        $applied = WebSpaceWafSettings::apply($current, $patch);
        if ($applied['error'] !== null) {
            return ApiResponse::error($applied['error'], 'INVALID_WAF_SETTINGS', 422, ['field' => $applied['field']]);
        }
        $next = $applied['settings'];

        $stored = array_intersect_key($next, array_flip(WebSpaceWafSettings::JSON_KEYS));
        $fields = [
            'waf_settings' => $stored,
            'waf_enabled' => $next['mode'] !== 'off' ? 1 : 0,
        ];
        if (array_key_exists('deny_ips', $patch)) {
            $fields['waf_deny_ips'] = $next['deny_ips'];
        }
        if (array_key_exists('deny_paths', $patch)) {
            $fields['waf_deny_paths'] = $next['deny_paths'];
        }

        $previous = $space;
        if (!WebSpace::update((string) $space['uuid'], $fields)) {
            return ApiResponse::error('Failed to save firewall settings', 'UPDATE_FAILED', 500);
        }
        $space = WebSpace::getByUuid((string) $space['uuid']) ?? $space;

        $daemon = WebSpaceDaemonSync::syncAfterUpdate($ctx['webNode'], $space, $previous);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                'Firewall settings saved on the panel but the web node could not be updated: ' . ($daemon['error'] ?? 'unknown'),
                'DAEMON_SYNC_FAILED',
                502,
            );
        }

        WebSpaceActivityLogger::log($space, $ctx['user'], 'webspace.waf.updated', ['fields' => $changed]);

        return ApiResponse::success($this->effective($space), 'OK', 200);
    }

    /**
     * Settings as the dashboard sees them: stored JSON + defaults, deny lists from their own columns.
     *
     * @param array<string, mixed> $space
     *
     * @return array<string, mixed>
     */
    private function effective(array $space): array
    {
        $stored = is_array($space['waf_settings'] ?? null) ? $space['waf_settings'] : [];
        $settings = WebSpaceWafSettings::withLegacyMode($stored, !empty($space['waf_enabled']));
        $settings['deny_ips'] = is_array($space['waf_deny_ips'] ?? null) ? array_values($space['waf_deny_ips']) : [];
        $settings['deny_paths'] = is_array($space['waf_deny_paths'] ?? null) ? array_values($space['waf_deny_paths']) : [];
        return $settings;
    }

    /**
     * @return array{space: array<string, mixed>, webNode: array<string, mixed>, user: array<string, mixed>}|Response
     */
    private function resolve(Request $request, string $uuidShort, string $permission): array | Response
    {
        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }
        $denied = CheckWebSpacePermission::require($request, $space, $permission);
        if ($denied instanceof Response) {
            return $denied;
        }
        $webNode = WebNode::getWebNodeById((int) ($space['web_node_id'] ?? 0));
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        return ['space' => $space, 'webNode' => $webNode, 'user' => (array) $request->attributes->get('user')];
    }

    /**
     * ErrorDocument lines pointing at a local file (not a URL, no traversal).
     *
     * @param list<string> $files
     *
     * @return array<string, int>
     */
    private function errorDocuments(array $webNode, string $uuid, array $files): array
    {
        $out = [];
        foreach ($files as $file) {
            if (!WebSpaceWafSettings::isValidPath($file)) {
                continue;
            }
            $read = FeatherQuilldClient::getWebSpaceFileContents($webNode, $uuid, ltrim($file, '/'));
            if (!$read['ok']) {
                continue;
            }
            $text = self::contentsString($read['body']);
            if ($text === '' || strlen($text) > 262144) {
                continue;
            }
            $base = rtrim(str_replace('/.htaccess', '', $file), '/');
            if (preg_match_all('/^\s*ErrorDocument\s+(40[0-9]|429|50[0-9])\s+"?([^\s"]+)"?\s*$/mi', $text, $m, PREG_SET_ORDER) < 1) {
                continue;
            }
            foreach ($m as $hit) {
                $target = $hit[2];
                if ($target === '' || $target[0] !== '/' || preg_match('~(^|/)\.\.(/|$)~', $target) === 1 || !preg_match('/\.html?$/i', $target)) {
                    continue;
                }
                $path = $base . $target;
                if (WebSpaceWafSettings::isValidPath($path)) {
                    $out[$path] = (int) $hit[1];
                }
            }
        }

        return $out;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function entries(mixed $body): array
    {
        if (!is_array($body)) {
            return [];
        }
        if (array_is_list($body)) {
            return array_values(array_filter($body, 'is_array'));
        }
        foreach (['entries', 'contents', 'files', 'data'] as $key) {
            $v = $body[$key] ?? null;
            if (is_array($v)) {
                return self::entries($v);
            }
        }

        return [];
    }

    private static function contentsString(mixed $body): string
    {
        if (is_string($body)) {
            return $body;
        }
        if (is_array($body)) {
            foreach (['contents', 'content', 'data'] as $key) {
                if (isset($body[$key]) && is_string($body[$key])) {
                    return $body[$key];
                }
            }
        }

        return '';
    }
}
