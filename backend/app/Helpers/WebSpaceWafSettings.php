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

namespace App\Helpers;

/**
 * Validation and defaults for the per-WebSpace layer-7 firewall settings.
 *
 * Pure logic (no database, no daemon) so it can be unit tested. Every value that
 * reaches the web node is checked here first; the daemon must still treat the
 * data as untrusted.
 */
final class WebSpaceWafSettings
{
    public const MODES = ['off', 'detect', 'block'];
    public const CATEGORIES = ['sqli', 'xss', 'rce', 'lfi', 'php', 'protocol', 'scanner', 'leakage'];
    public const TARGETS = ['path', 'query', 'user_agent', 'referer', 'method', 'host'];
    public const OPS = ['contains', 'equals', 'starts', 'regex'];
    public const ACTIONS = ['block', 'allow', 'log'];
    public const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
    public const BLOCK_STATUSES = [403, 406, 429, 503];
    public const MAX_HTML_BYTES = 65536;
    public const MAX_IPS = 500;
    public const MAX_PATHS = 200;
    public const MAX_RULES = 30;
    public const MAX_EXCEPTIONS = 100;

    /** Keys stored in the `waf_settings` JSON column (deny lists live in their own columns). */
    public const JSON_KEYS = [
        'mode', 'allow_ips', 'rate_limit', 'anti_bot', 'exceptions', 'engine', 'custom_rules',
        'geo', 'http', 'headers', 'hotlink', 'login', 'block_page',
    ];

    /**
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return [
            'mode' => 'detect',
            'allow_ips' => [],
            'deny_ips' => [],
            'deny_paths' => [],
            'rate_limit' => ['enabled' => false, 'per_minute' => 240, 'ban_minutes' => 15],
            'anti_bot' => ['scanner_paths' => true, 'bad_agents' => false, 'empty_agent' => false, 'custom_agents' => []],
            'exceptions' => [],
            'engine' => [
                'sensitivity' => 1,
                'categories' => [
                    'sqli' => true, 'xss' => true, 'rce' => true, 'lfi' => true,
                    'php' => true, 'protocol' => true, 'scanner' => true, 'leakage' => false,
                ],
            ],
            'custom_rules' => [],
            'geo' => ['mode' => 'off', 'countries' => []],
            'http' => ['methods' => self::METHODS, 'max_body_mb' => 10, 'max_url_length' => 2048],
            'headers' => ['hsts' => false, 'nosniff' => true, 'referrer' => true, 'permissions' => false, 'frame' => 'sameorigin'],
            'hotlink' => ['enabled' => false, 'allowed_hosts' => [], 'extensions' => ['jpg', 'jpeg', 'png', 'gif', 'webp']],
            'login' => ['enabled' => false, 'paths' => ['/wp-login.php', '/xmlrpc.php', '/administrator', '/login'], 'per_minute' => 10, 'ban_minutes' => 30],
            'block_page' => ['status' => 403, 'message' => 'Access denied', 'html' => ''],
        ];
    }

    /**
     * Fill missing keys of a stored value with defaults. Never throws on bad stored data.
     *
     * @param array<string, mixed> $stored
     *
     * @return array<string, mixed>
     */
    public static function withDefaults(array $stored): array
    {
        $d = self::defaults();
        foreach ($d as $key => $default) {
            if (!array_key_exists($key, $stored)) {
                continue;
            }
            $value = $stored[$key];
            if (is_array($default) && self::isAssoc($default) && is_array($value)) {
                $merged = $default;
                foreach ($value as $k => $v) {
                    if (!array_key_exists($k, $default)) {
                        continue;
                    }
                    if ($k === 'categories' && is_array($v)) {
                        $merged[$k] = array_merge($default[$k], array_intersect_key($v, $default[$k]));
                        continue;
                    }
                    $merged[$k] = $v;
                }
                $d[$key] = $merged;
            } else {
                $d[$key] = $value;
            }
        }

        return $d;
    }

    /**
     * Validate a partial update. Only keys present in $patch are touched.
     *
     * @param array<string, mixed> $current full current settings (already with defaults)
     * @param array<string, mixed> $patch   decoded request body
     *
     * @return array{settings: array<string, mixed>, error: ?string, field: ?string}
     */
    public static function apply(array $current, array $patch): array
    {
        $next = $current;
        $known = array_merge(self::JSON_KEYS, ['deny_ips', 'deny_paths']);
        foreach (array_keys($patch) as $key) {
            if (!in_array($key, $known, true)) {
                return self::fail('Unknown setting', (string) $key);
            }
        }

        foreach ($patch as $key => $value) {
            $result = self::validateKey((string) $key, $value, $current);
            if ($result[1] !== null) {
                return self::fail($result[1], (string) $key);
            }
            $next[$key] = $result[0];
        }

        $size = strlen((string) json_encode($next));
        if ($size > 200000) {
            return self::fail('Settings are too large', null);
        }

        return ['settings' => $next, 'error' => null, 'field' => null];
    }

    /**
     * @return array{0: mixed, 1: ?string}
     */
    private static function validateKey(string $key, mixed $v, array $current): array
    {
        switch ($key) {
            case 'mode':
                return is_string($v) && in_array($v, self::MODES, true) ? [$v, null] : [null, 'Invalid mode'];
            case 'allow_ips':
            case 'deny_ips':
                return self::ipList($v);
            case 'deny_paths':
                return self::pathList($v, self::MAX_PATHS);
            case 'rate_limit':
                return self::limit($v, 'per_minute', 10, 10000, 'ban_minutes', 1, 1440, $current['rate_limit']);
            case 'login':
                return self::login($v, $current['login']);
            case 'anti_bot':
                return self::antiBot($v, $current['anti_bot']);
            case 'engine':
                return self::engine($v, $current['engine']);
            case 'exceptions':
                return self::exceptions($v);
            case 'custom_rules':
                return self::customRules($v);
            case 'geo':
                return self::geo($v);
            case 'http':
                return self::http($v);
            case 'headers':
                return self::headers($v, $current['headers']);
            case 'hotlink':
                return self::hotlink($v, $current['hotlink']);
            case 'block_page':
                return self::blockPage($v, $current['block_page']);
        }

        return [null, 'Unknown setting'];
    }

    public static function isValidIp(string $value): bool
    {
        $value = trim($value);
        if ($value === '' || strlen($value) > 45) {
            return false;
        }
        if (!str_contains($value, '/')) {
            return filter_var($value, FILTER_VALIDATE_IP) !== false;
        }
        [$ip, $prefix] = explode('/', $value, 2);
        if (!ctype_digit($prefix) || filter_var($ip, FILTER_VALIDATE_IP) === false) {
            return false;
        }
        $max = str_contains($ip, ':') ? 128 : 32;

        return (int) $prefix >= 0 && (int) $prefix <= $max;
    }

    public static function isValidPath(string $path): bool
    {
        return $path !== ''
            && strlen($path) <= 200
            && $path[0] === '/'
            && preg_match('/[\x00-\x20\x7f"\'`<>\\\\]/', $path) !== 1;
    }

    /**
     * The daemon engine (Coraza/Go) uses RE2, which has no lookaround or backreferences.
     * Reject those here so the panel never accepts a rule the node cannot load.
     */
    public static function isValidRegex(string $pattern): bool
    {
        if ($pattern === '' || strlen($pattern) > 200) {
            return false;
        }
        // lookahead/lookbehind, numbered backreferences, atomic groups
        if (preg_match('/\(\?<?[=!]|\\\\[1-9]|\(\?>/', $pattern) === 1) {
            return false;
        }
        set_error_handler(static fn () => true);
        try {
            $ok = @preg_match('~' . str_replace('~', '\~', $pattern) . '~u', '') !== false;
        } finally {
            restore_error_handler();
        }

        return $ok;
    }

    /** @return array{0: list<string>|null, 1: ?string} */
    private static function ipList(mixed $v): array
    {
        if (!is_array($v) || count($v) > self::MAX_IPS) {
            return [null, 'Invalid IP list'];
        }
        $out = [];
        foreach ($v as $ip) {
            if (!is_string($ip) || !self::isValidIp($ip)) {
                return [null, 'Invalid IP address or range'];
            }
            $out[strtolower(trim($ip))] = true;
        }

        return [array_keys($out), null];
    }

    /** @return array{0: list<string>|null, 1: ?string} */
    private static function pathList(mixed $v, int $max): array
    {
        if (!is_array($v) || count($v) > $max) {
            return [null, 'Invalid path list'];
        }
        $out = [];
        foreach ($v as $p) {
            if (!is_string($p) || !self::isValidPath($p)) {
                return [null, 'Invalid path'];
            }
            $out[$p] = true;
        }

        return [array_keys($out), null];
    }

    private static function int(mixed $v, int $min, int $max): ?int
    {
        if (is_bool($v) || !is_numeric($v) || (float) $v !== (float) (int) $v) {
            return null;
        }
        $n = (int) $v;

        return $n >= $min && $n <= $max ? $n : null;
    }

    /** @return array{0: array<string, mixed>|null, 1: ?string} */
    private static function limit(mixed $v, string $a, int $aMin, int $aMax, string $b, int $bMin, int $bMax, array $current): array
    {
        if (!is_array($v) || !is_bool($v['enabled'] ?? null)) {
            return [null, 'Invalid limit settings'];
        }
        $x = self::int($v[$a] ?? null, $aMin, $aMax);
        $y = self::int($v[$b] ?? null, $bMin, $bMax);
        if ($x === null || $y === null) {
            return [null, 'Limit out of range'];
        }

        return [['enabled' => $v['enabled'], $a => $x, $b => $y], null];
    }

    /** @return array{0: array<string, mixed>|null, 1: ?string} */
    private static function login(mixed $v, array $current): array
    {
        if (!is_array($v)) {
            return [null, 'Invalid login settings'];
        }
        $lim = self::limit($v, 'per_minute', 1, 600, 'ban_minutes', 1, 1440, $current);
        if ($lim[1] !== null) {
            return $lim;
        }
        $paths = array_key_exists('paths', $v) ? self::pathList($v['paths'], 30) : [$current['paths'], null];
        if ($paths[1] !== null) {
            return [null, $paths[1]];
        }

        return [$lim[0] + ['paths' => $paths[0]], null];
    }

    /** @return array{0: array<string, mixed>|null, 1: ?string} */
    private static function antiBot(mixed $v, array $current): array
    {
        if (!is_array($v)) {
            return [null, 'Invalid anti-bot settings'];
        }
        $out = [];
        foreach (['scanner_paths', 'bad_agents', 'empty_agent'] as $flag) {
            $val = array_key_exists($flag, $v) ? $v[$flag] : $current[$flag];
            if (!is_bool($val)) {
                return [null, 'Invalid anti-bot flag'];
            }
            $out[$flag] = $val;
        }
        $agents = array_key_exists('custom_agents', $v) ? $v['custom_agents'] : $current['custom_agents'];
        if (!is_array($agents) || count($agents) > 50) {
            return [null, 'Invalid user agent list'];
        }
        $list = [];
        foreach ($agents as $a) {
            if (!is_string($a) || strlen($a) < 2 || strlen($a) > 80 || preg_match('/[\x00-\x1f\x7f]/', $a) === 1) {
                return [null, 'Invalid user agent'];
            }
            $list[$a] = true;
        }
        $out['custom_agents'] = array_keys($list);

        return [$out, null];
    }

    /** @return array{0: array<string, mixed>|null, 1: ?string} */
    private static function engine(mixed $v, array $current): array
    {
        if (!is_array($v)) {
            return [null, 'Invalid engine settings'];
        }
        $level = self::int($v['sensitivity'] ?? $current['sensitivity'], 1, 4);
        $cats = $v['categories'] ?? $current['categories'];
        if ($level === null || !is_array($cats)) {
            return [null, 'Invalid engine settings'];
        }
        $out = [];
        foreach (self::CATEGORIES as $c) {
            $val = $cats[$c] ?? $current['categories'][$c];
            if (!is_bool($val)) {
                return [null, 'Invalid attack type'];
            }
            $out[$c] = $val;
        }

        return [['sensitivity' => $level, 'categories' => $out], null];
    }

    /** @return array{0: list<array<string, mixed>>|null, 1: ?string} */
    private static function exceptions(mixed $v): array
    {
        if (!is_array($v) || count($v) > self::MAX_EXCEPTIONS) {
            return [null, 'Invalid exceptions'];
        }
        $out = [];
        $seen = [];
        foreach ($v as $e) {
            if (!is_array($e) || !is_string($e['path'] ?? null) || !self::isValidPath($e['path']) || $e['path'] === '/') {
                return [null, 'Invalid exception path'];
            }
            $cats = $e['categories'] ?? [];
            if (!is_array($cats) || array_diff($cats, self::CATEGORIES) !== []) {
                return [null, 'Invalid exception category'];
            }
            if (isset($seen[$e['path']])) {
                return [null, 'Duplicate exception path'];
            }
            $seen[$e['path']] = true;
            $out[] = [
                'id' => self::cleanId($e['id'] ?? null),
                'path' => $e['path'],
                'categories' => array_values(array_unique($cats)),
            ];
        }

        return [$out, null];
    }

    /** @return array{0: list<array<string, mixed>>|null, 1: ?string} */
    private static function customRules(mixed $v): array
    {
        if (!is_array($v) || count($v) > self::MAX_RULES) {
            return [null, 'Too many custom rules'];
        }
        $out = [];
        foreach ($v as $r) {
            if (!is_array($r)
                || !in_array($r['target'] ?? null, self::TARGETS, true)
                || !in_array($r['op'] ?? null, self::OPS, true)
                || !in_array($r['action'] ?? null, self::ACTIONS, true)
                || !is_bool($r['enabled'] ?? null)
                || !is_string($r['value'] ?? null)
                || $r['value'] === ''
                || strlen($r['value']) > 200
                || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/', $r['value']) === 1
            ) {
                return [null, 'Invalid custom rule'];
            }
            if ($r['op'] === 'regex' && !self::isValidRegex($r['value'])) {
                return [null, 'Invalid regular expression (lookaround and backreferences are not supported)'];
            }
            $name = is_string($r['name'] ?? null) ? trim($r['name']) : '';
            $out[] = [
                'id' => self::cleanId($r['id'] ?? null),
                'name' => mb_substr($name !== '' ? $name : $r['value'], 0, 60),
                'target' => $r['target'],
                'op' => $r['op'],
                'value' => $r['value'],
                'action' => $r['action'],
                'enabled' => $r['enabled'],
            ];
        }

        return [$out, null];
    }

    /** @return array{0: array<string, mixed>|null, 1: ?string} */
    private static function geo(mixed $v): array
    {
        if (!is_array($v) || !in_array($v['mode'] ?? null, ['off', 'deny', 'allow'], true) || !is_array($v['countries'] ?? null)) {
            return [null, 'Invalid country filter'];
        }
        $out = [];
        foreach ($v['countries'] as $c) {
            if (!is_string($c) || preg_match('/^[A-Z]{2}$/', $c) !== 1) {
                return [null, 'Invalid country code'];
            }
            $out[$c] = true;
        }
        if (count($out) > 250) {
            return [null, 'Too many countries'];
        }

        return [['mode' => $v['mode'], 'countries' => array_keys($out)], null];
    }

    /** @return array{0: array<string, mixed>|null, 1: ?string} */
    private static function http(mixed $v): array
    {
        if (!is_array($v) || !is_array($v['methods'] ?? null)) {
            return [null, 'Invalid HTTP settings'];
        }
        $methods = array_values(array_unique($v['methods']));
        if ($methods === [] || array_diff($methods, self::METHODS) !== []) {
            return [null, 'Choose at least one valid HTTP method'];
        }
        $body = self::int($v['max_body_mb'] ?? null, 1, 1024);
        $url = self::int($v['max_url_length'] ?? null, 256, 8192);
        if ($body === null || $url === null) {
            return [null, 'Limit out of range'];
        }

        return [['methods' => $methods, 'max_body_mb' => $body, 'max_url_length' => $url], null];
    }

    /** @return array{0: array<string, mixed>|null, 1: ?string} */
    private static function headers(mixed $v, array $current): array
    {
        if (!is_array($v)) {
            return [null, 'Invalid header settings'];
        }
        $out = [];
        foreach (['hsts', 'nosniff', 'referrer', 'permissions'] as $flag) {
            $val = array_key_exists($flag, $v) ? $v[$flag] : $current[$flag];
            if (!is_bool($val)) {
                return [null, 'Invalid header flag'];
            }
            $out[$flag] = $val;
        }
        $frame = $v['frame'] ?? $current['frame'];
        if (!in_array($frame, ['off', 'sameorigin', 'deny'], true)) {
            return [null, 'Invalid frame option'];
        }
        $out['frame'] = $frame;

        return [$out, null];
    }

    /** @return array{0: array<string, mixed>|null, 1: ?string} */
    private static function hotlink(mixed $v, array $current): array
    {
        if (!is_array($v) || !is_bool($v['enabled'] ?? null)) {
            return [null, 'Invalid hotlink settings'];
        }
        $hosts = $v['allowed_hosts'] ?? $current['allowed_hosts'];
        $exts = $v['extensions'] ?? $current['extensions'];
        if (!is_array($hosts) || count($hosts) > 50 || !is_array($exts) || count($exts) > 30) {
            return [null, 'Invalid hotlink lists'];
        }
        $h = [];
        foreach ($hosts as $host) {
            if (!is_string($host) || strlen($host) > 253 || preg_match('/^(\*\.)?([a-z0-9-]+\.)+[a-z]{2,}$/i', $host) !== 1) {
                return [null, 'Invalid host name'];
            }
            $h[strtolower($host)] = true;
        }
        $e = [];
        foreach ($exts as $ext) {
            if (!is_string($ext) || preg_match('/^[a-z0-9]{1,5}$/i', $ext) !== 1) {
                return [null, 'Invalid file extension'];
            }
            $e[strtolower($ext)] = true;
        }

        return [['enabled' => $v['enabled'], 'allowed_hosts' => array_keys($h), 'extensions' => array_keys($e)], null];
    }

    /** @return array{0: array<string, mixed>|null, 1: ?string} */
    private static function blockPage(mixed $v, array $current): array
    {
        if (!is_array($v)) {
            return [null, 'Invalid block page'];
        }
        $status = self::int($v['status'] ?? $current['status'], 100, 599);
        if ($status === null || !in_array($status, self::BLOCK_STATUSES, true)) {
            return [null, 'Invalid status code'];
        }
        $message = $v['message'] ?? $current['message'];
        $html = $v['html'] ?? $current['html'];
        if (!is_string($message) || mb_strlen($message) > 300 || !is_string($html) || strlen($html) > self::MAX_HTML_BYTES) {
            return [null, 'Block page text is too long'];
        }
        if ($html !== '' && !mb_check_encoding($html, 'UTF-8')) {
            return [null, 'Block page must be valid UTF-8'];
        }

        return [['status' => $status, 'message' => trim($message), 'html' => $html], null];
    }

    private static function cleanId(mixed $id): string
    {
        if (is_string($id) && preg_match('/^[A-Za-z0-9-]{1,40}$/', $id) === 1) {
            return $id;
        }

        return bin2hex(random_bytes(8));
    }

    /**
     * @return array{settings: array<string, mixed>, error: string, field: ?string}
     */
    private static function fail(string $error, ?string $field): array
    {
        return ['settings' => [], 'error' => $error, 'field' => $field];
    }

    /** @param array<mixed> $a */
    private static function isAssoc(array $a): bool
    {
        return $a !== [] && array_keys($a) !== range(0, count($a) - 1);
    }
}
