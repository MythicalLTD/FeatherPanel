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

namespace App\Services\FeatherCloud;

use App\App;
use App\Chat\Node;
use App\Chat\User;
use App\Chat\Server;
use App\Helpers\LogHelper;
use App\Chat\InstalledPlugin;
use App\Services\Wings\Wings;
use App\Helpers\WingsUrlHelper;

/**
 * Collects environment diagnostics + panel/node logs for Mythic issue reports.
 *
 * Mythic schema (panels.mythicalsystems.org): diagnostics scalars are strings;
 * install_type is an enum; plugins/extensions are newline-separated strings.
 */
class MythicIssueReportCollector
{
    public const PROJECT = 'featherpanel';

    /** @see \App\Support\IssueDiagnostics::INSTALL_TYPES on Mythic */
    public const INSTALL_TYPES = [
        'docker',
        'bare_metal',
        'vps',
        'shared_hosting',
        'kubernetes',
        'other',
    ];

    private const PANEL_LOG_TYPES = ['app', 'web', 'mail', 'runner'];
    private const PANEL_LOG_LINES = 3000;
    private const PANEL_LOG_MAX_BYTES = 500000;
    private const NODE_LOG_LINES = 200;
    private const NODE_DIAG_TIMEOUT = 12;

    /**
     * @param array<string, mixed> $payload Incoming issue payload
     * @param bool $includeNodeDiagnostics Fetch Wings diagnostics + logs per node
     * @param bool $includePanelLogs Upload panel app/web/mail/runner logs
     *
     * @return array{
     *   diagnostics: array<string, mixed>,
     *   log_pastes: array<string, array<string, mixed>>,
     *   node_pastes: list<array<string, mixed>>,
     *   logs_summary: string
     * }
     */
    public function collect(
        array $payload,
        bool $includeNodeDiagnostics = true,
        bool $includePanelLogs = true,
    ): array {
        $diagnostics = $this->buildEnvironmentDiagnostics($payload);
        $logPastes = $includePanelLogs ? $this->uploadPanelLogs() : [];
        $nodePastes = $includeNodeDiagnostics ? $this->collectNodeDiagnostics() : [];

        $diagnostics['log_pastes'] = $logPastes;
        $diagnostics['node_diagnostics'] = array_map(static function (array $node): array {
            return [
                'node_id' => $node['node_id'] ?? null,
                'name' => $node['name'] ?? null,
                'fqdn' => $node['fqdn'] ?? null,
                'success' => (bool) ($node['success'] ?? false),
                'url' => $node['url'] ?? null,
                'error' => $node['error'] ?? null,
            ];
        }, $nodePastes);

        $logsSummary = ($includePanelLogs || $includeNodeDiagnostics)
            ? $this->formatLogsSummary($logPastes, $nodePastes)
            : '';

        if ($logsSummary !== '') {
            $diagnostics['logs'] = trim(
                (string) ($diagnostics['logs'] ?? '') . "\n\n" . $logsSummary
            );
        }

        return [
            'diagnostics' => $diagnostics,
            'log_pastes' => $logPastes,
            'node_pastes' => $nodePastes,
            'logs_summary' => $logsSummary,
        ];
    }

    /**
     * Merge collected data into a Mythic createIssue body.
     *
     * @param array<string, mixed> $payload
     * @param array{
     *   diagnostics: array<string, mixed>,
     *   log_pastes: array<string, array<string, mixed>>,
     *   node_pastes: list<array<string, mixed>>,
     *   logs_summary: string
     * } $collected
     *
     * @return array<string, mixed>
     */
    public function mergeIntoPayload(array $payload, array $collected): array
    {
        $payload['diagnostics'] = self::normalizeDiagnosticsForMythic($collected['diagnostics']);

        $logsSummary = trim((string) ($collected['logs_summary'] ?? ''));
        if ($logsSummary !== '') {
            $payload['logs'] = trim((string) ($payload['logs'] ?? '') . "\n\n" . $logsSummary);
        }

        $appendix = $this->buildBodyAppendix($collected);
        $body = trim((string) ($payload['body'] ?? ''));
        $payload['body'] = $body !== '' ? $body . "\n\n" . $appendix : $appendix;

        return $payload;
    }

    /**
     * Detect install type for Mythic's install_type enum.
     */
    public static function detectInstallType(): string
    {
        if (getenv('KUBERNETES_SERVICE_HOST') || getenv('KUBERNETES_PORT')) {
            return 'kubernetes';
        }

        if (
            is_file('/.dockerenv')
            || is_file('/run/.containerenv')
            || (isset($_SERVER['FEATHERPANEL_DOCKER']) && $_SERVER['FEATHERPANEL_DOCKER'] !== '')
            || getenv('FEATHERPANEL_DOCKER')
        ) {
            return 'docker';
        }

        // Traditional installer / bare PHP host — closest valid enum value.
        return 'bare_metal';
    }

    /**
     * Mythic validates diagnostics as strings (plugins/extensions are strings, not arrays).
     * install_type must be one of INSTALL_TYPES.
     *
     * @param array<string, mixed> $diagnostics
     *
     * @return array<string, string>
     */
    public static function normalizeDiagnosticsForMythic(array $diagnostics): array
    {
        $pluginsLines = [];
        $rawPlugins = $diagnostics['plugins'] ?? '';
        if (is_array($rawPlugins)) {
            foreach ($rawPlugins as $plugin) {
                if (is_string($plugin) && $plugin !== '') {
                    $pluginsLines[] = $plugin;
                } elseif (is_array($plugin)) {
                    $name = trim((string) ($plugin['identifier'] ?? $plugin['name'] ?? ''));
                    if ($name !== '') {
                        $version = trim((string) ($plugin['version'] ?? ''));
                        $pluginsLines[] = $version !== '' ? $name . '@' . $version : $name;
                    }
                }
            }
        } elseif (is_string($rawPlugins) || is_numeric($rawPlugins)) {
            $pluginsLines[] = (string) $rawPlugins;
        }

        $extensionLines = [];
        $rawExtensions = $diagnostics['extensions'] ?? '';
        if (is_array($rawExtensions)) {
            foreach ($rawExtensions as $ext) {
                if (is_string($ext) || is_numeric($ext)) {
                    $extensionLines[] = (string) $ext;
                }
            }
        } elseif (is_string($rawExtensions) || is_numeric($rawExtensions)) {
            $extensionLines[] = (string) $rawExtensions;
        }

        $stringOrEmpty = static function (mixed $value): string {
            if ($value === null) {
                return '';
            }
            if (is_bool($value)) {
                return $value ? 'true' : 'false';
            }
            if (is_array($value) || is_object($value)) {
                return json_encode($value, JSON_UNESCAPED_SLASHES) ?: '';
            }

            return (string) $value;
        };

        $installType = strtolower(trim($stringOrEmpty($diagnostics['install_type'] ?? '')));
        if ($installType === '' || $installType === 'unknown') {
            $installType = self::detectInstallType();
        }
        if (!in_array($installType, self::INSTALL_TYPES, true)) {
            $installType = 'other';
        }

        $clamp = static function (string $value, int $max): string {
            if ($max <= 0 || strlen($value) <= $max) {
                return $value;
            }

            return substr($value, 0, $max);
        };

        return [
            'version' => $clamp($stringOrEmpty($diagnostics['version'] ?? ''), 100),
            'php_version' => $clamp($stringOrEmpty($diagnostics['php_version'] ?? PHP_VERSION), 50),
            'database' => $clamp($stringOrEmpty($diagnostics['database'] ?? 'mysql'), 120),
            'os' => $clamp($stringOrEmpty($diagnostics['os'] ?? PHP_OS_FAMILY), 120),
            'install_type' => $installType,
            'install_location' => $clamp($stringOrEmpty($diagnostics['install_location'] ?? ''), 255),
            // Mythic schema: these MUST be strings (not integers).
            'user_count' => $clamp($stringOrEmpty($diagnostics['user_count'] ?? '0'), 50),
            'server_count' => $clamp($stringOrEmpty($diagnostics['server_count'] ?? '0'), 50),
            // Mythic schema: plugins/extensions are newline-separated strings, not arrays.
            'plugins' => $clamp(implode("\n", $pluginsLines), 5000),
            'extensions' => $clamp(implode("\n", $extensionLines), 5000),
            'steps' => $clamp($stringOrEmpty($diagnostics['steps'] ?? ''), 10000),
            'expected' => $clamp($stringOrEmpty($diagnostics['expected'] ?? ''), 5000),
            'actual' => $clamp($stringOrEmpty($diagnostics['actual'] ?? ''), 5000),
            'logs' => $clamp($stringOrEmpty($diagnostics['logs'] ?? ''), 20000),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     *
     * @return array<string, mixed>
     */
    private function buildEnvironmentDiagnostics(array $payload): array
    {
        $plugins = [];
        try {
            foreach (InstalledPlugin::getAllInstalledPlugins() as $plugin) {
                $plugins[] = [
                    'identifier' => $plugin['identifier'] ?? $plugin['name'] ?? null,
                    'version' => isset($plugin['version']) ? (string) $plugin['version'] : null,
                ];
            }
        } catch (\Throwable) {
            $plugins = [];
        }

        $userCount = '0';
        $serverCount = '0';
        $nodeCount = '0';
        try {
            $userCount = (string) User::getCount();
        } catch (\Throwable) {
        }
        try {
            $serverCount = (string) Server::getCount();
        } catch (\Throwable) {
        }
        try {
            $nodeCount = (string) Node::getNodesCount();
        } catch (\Throwable) {
        }

        $config = App::getInstance(true)->getConfig();
        $appUrl = (string) ($config->getSetting(\App\Config\ConfigInterface::APP_URL, '') ?? '');

        return [
            'version' => defined('APP_VERSION') ? (string) APP_VERSION : '',
            'upstream' => defined('APP_UPSTREAM') ? (string) APP_UPSTREAM : '',
            'php_version' => PHP_VERSION,
            'php_sapi' => PHP_SAPI,
            'database' => 'mysql',
            'os' => PHP_OS_FAMILY,
            'os_detail' => php_uname('s') . ' ' . php_uname('r'),
            'install_type' => self::detectInstallType(),
            // Mythic treats this as install URL / hostname (not a filesystem path).
            'install_location' => $appUrl !== '' ? $appUrl : dirname(__DIR__, 4),
            'app_url' => $appUrl,
            'timezone' => date_default_timezone_get(),
            'user_count' => $userCount,
            'server_count' => $serverCount,
            'node_count' => $nodeCount,
            'plugins' => $plugins,
            'extensions' => array_map('strval', get_loaded_extensions()),
            'memory_limit' => (string) ini_get('memory_limit'),
            'max_execution_time' => (string) ini_get('max_execution_time'),
            'steps' => isset($payload['steps']) ? (string) $payload['steps'] : '',
            'expected' => isset($payload['expected']) ? (string) $payload['expected'] : '',
            'actual' => isset($payload['actual']) ? (string) $payload['actual'] : '',
            'logs' => isset($payload['logs']) ? (string) $payload['logs'] : '',
            'collected_at' => gmdate('c'),
        ];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function uploadPanelLogs(): array
    {
        $results = [];

        foreach (self::PANEL_LOG_TYPES as $type) {
            $path = LogHelper::getLogFilePath($type);
            if (!is_file($path)) {
                $results[$type] = [
                    'success' => false,
                    'error' => 'Log file not found',
                ];
                continue;
            }

            $content = $this->truncate(LogHelper::readLastLines($path, self::PANEL_LOG_LINES));
            if (trim($content) === '') {
                $results[$type] = [
                    'success' => false,
                    'error' => 'Log file empty',
                ];
                continue;
            }

            $header = "=== FeatherPanel {$type} log (last " . self::PANEL_LOG_LINES . " lines) ===\n";
            $upload = LogHelper::uploadToMcloGs($header . $content);
            $results[$type] = $upload;
        }

        return $results;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function collectNodeDiagnostics(): array
    {
        $nodes = [];
        try {
            $nodes = Node::getAllNodes();
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->warning(
                'Mythic issue collector: failed to list nodes: ' . $e->getMessage()
            );

            return [];
        }

        $out = [];
        foreach ($nodes as $node) {
            $nodeId = (int) ($node['id'] ?? 0);
            $name = (string) ($node['name'] ?? ('node-' . $nodeId));
            $fqdn = (string) ($node['fqdn'] ?? '');

            $entry = [
                'node_id' => $nodeId,
                'name' => $name,
                'fqdn' => $fqdn,
                'success' => false,
                'url' => null,
                'error' => null,
            ];

            if ($nodeId <= 0 || $fqdn === '' || empty($node['daemon_token'])) {
                $entry['error'] = 'Node missing connection details';
                $out[] = $entry;
                continue;
            }

            try {
                $wings = new Wings(
                    $fqdn,
                    (int) ($node['daemonListen'] ?? 8080),
                    (string) ($node['scheme'] ?? 'https'),
                    (string) $node['daemon_token'],
                    self::NODE_DIAG_TIMEOUT,
                    WingsUrlHelper::isBehindProxy($node)
                );

                $diag = $wings->getSystem()->getDiagnostics(
                    true,
                    true,
                    self::NODE_LOG_LINES,
                    'text',
                    null
                );

                $content = is_string($diag) ? $diag : json_encode($diag, JSON_PRETTY_PRINT);
                if (!is_string($content) || trim($content) === '') {
                    $entry['error'] = 'Empty diagnostics response';
                    $out[] = $entry;
                    continue;
                }

                $header = "=== Wings node diagnostics: {$name} ({$fqdn}) ===\n";
                $upload = LogHelper::uploadToMcloGs($header . $this->truncate($content));
                if (!empty($upload['success'])) {
                    $entry['success'] = true;
                    $entry['url'] = $upload['url'] ?? null;
                    $entry['id'] = $upload['id'] ?? null;
                } else {
                    $entry['error'] = $upload['error'] ?? 'Upload failed';
                }
            } catch (\Throwable $e) {
                $entry['error'] = $e->getMessage();
                App::getInstance(true)->getLogger()->warning(
                    "Mythic issue collector: node {$nodeId} diagnostics failed: " . $e->getMessage()
                );
            }

            $out[] = $entry;
        }

        return $out;
    }

    /**
     * @param array<string, array<string, mixed>> $logPastes
     * @param list<array<string, mixed>> $nodePastes
     */
    private function formatLogsSummary(array $logPastes, array $nodePastes): string
    {
        $lines = ['Auto-uploaded diagnostics:'];

        foreach ($logPastes as $type => $result) {
            if (!empty($result['success']) && !empty($result['url'])) {
                $lines[] = "- Panel {$type} log: {$result['url']}";
            } else {
                $err = $result['error'] ?? 'unavailable';
                $lines[] = "- Panel {$type} log: (not attached — {$err})";
            }
        }

        if ($nodePastes === []) {
            $lines[] = '- Nodes: none configured';
        } else {
            foreach ($nodePastes as $node) {
                $label = ($node['name'] ?? 'node') . ' / ' . ($node['fqdn'] ?? '');
                if (!empty($node['success']) && !empty($node['url'])) {
                    $lines[] = "- Node {$label}: {$node['url']}";
                } else {
                    $err = $node['error'] ?? 'unavailable';
                    $lines[] = "- Node {$label}: (not attached — {$err})";
                }
            }
        }

        return implode("\n", $lines);
    }

    /**
     * @param array{
     *   diagnostics: array<string, mixed>,
     *   log_pastes: array<string, array<string, mixed>>,
     *   node_pastes: list<array<string, mixed>>,
     *   logs_summary: string
     * } $collected
     */
    private function buildBodyAppendix(array $collected): string
    {
        $d = $collected['diagnostics'];
        $pluginCount = is_array($d['plugins'] ?? null)
            ? count($d['plugins'])
            : (trim((string) ($d['plugins'] ?? '')) !== '' ? substr_count((string) $d['plugins'], "\n") + 1 : 0);

        $lines = [
            '---',
            '### Automatic environment',
            '- FeatherPanel: ' . ($d['version'] ?? 'unknown') . ' (' . ($d['upstream'] ?? 'n/a') . ')',
            '- PHP: ' . ($d['php_version'] ?? 'unknown') . ' / ' . ($d['php_sapi'] ?? ''),
            '- OS: ' . ($d['os_detail'] ?? ($d['os'] ?? 'unknown')),
            '- Install: ' . ($d['install_type'] ?? 'other'),
            '- Users / servers / nodes: '
                . ($d['user_count'] ?? '?') . ' / '
                . ($d['server_count'] ?? '?') . ' / '
                . ($d['node_count'] ?? '?'),
            '- Plugins: ' . $pluginCount,
        ];

        $logsSummary = trim((string) ($collected['logs_summary'] ?? ''));
        if ($logsSummary !== '') {
            $lines[] = '';
            $lines[] = $logsSummary;
        }

        return implode("\n", $lines);
    }

    private function truncate(string $content): string
    {
        $length = strlen($content);
        if ($length <= self::PANEL_LOG_MAX_BYTES) {
            return $content;
        }

        return substr($content, -self::PANEL_LOG_MAX_BYTES);
    }
}
