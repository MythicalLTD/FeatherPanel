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

use App\Chat\DnsHost;
use App\Chat\WebNode;
use App\Chat\MailHost;
use App\Chat\WebPlate;
use App\Chat\WebSpace;
use App\Chat\DatabaseInstance;

/**
 * Platform-level view of what FeatherPanel WebSpaces can do today vs what still needs setup.
 */
class WebSpaceHostingMaturity
{
    /**
     * @return array{
     *   score: int,
     *   tier: string,
     *   summary: array{ready: int, setup: int, builtin: int, roadmap: int},
     *   builtin: list<array{id: string, status: string}>,
     *   setup: list<array{id: string, status: string, detail: ?string, action?: array{label: string, href: string}}>,
     *   roadmap: list<array{id: string}>,
     *   sample_node_id: ?int
     * }
     */
    public static function assess(?int $preferredWebNodeId = null): array
    {
        $webNodeCount = WebNode::count([]);
        $webPlateCount = WebPlate::countAll();
        $webSpaceCount = WebSpace::countAll();
        $databaseHostCount = DatabaseInstance::count();
        $mailHostCount = count(MailHost::listAll());
        $dnsHostCount = count(DnsHost::listAll());

        $sampleNode = self::resolveSampleNode($preferredWebNodeId);
        $sampleNodeId = $sampleNode ? (int) ($sampleNode['id'] ?? 0) : null;
        $daemonHealthy = false;
        $proxyReady = false;
        $dockerReady = false;
        $mailServerReady = false;
        $proxyProvider = null;

        if ($sampleNode) {
            $health = FeatherQuilldProbe::probeHealth($sampleNode);
            $daemonHealthy = $health['status'] === 'healthy';
            if ($daemonHealthy) {
                $diag = FeatherQuilldClient::getDiagnostics($sampleNode);
                if ($diag['ok'] && is_array($diag['body'])) {
                    $proxyReady = self::daemonCheckOk($diag['body'], 'proxy.binary');
                    $dockerReady = self::daemonCheckOk($diag['body'], 'docker.cli');
                    $mailServerReady = self::daemonCheckOk($diag['body'], 'mail.stack');
                    $proxyProvider = self::extractProxyProvider($diag['body']);
                }
            }
        }

        if ($sampleNodeId !== null && $sampleNodeId > 0) {
            foreach (MailHost::listForWebNode($sampleNodeId) as $host) {
                if (strtolower(trim((string) ($host['provision_mode'] ?? ''))) === 'node') {
                    $mailServerReady = true;
                    break;
                }
            }
        }

        $nodeAcme = $sampleNode ? trim((string) ($sampleNode['acmeEmail'] ?? '')) : '';
        $ftpEnabled = $sampleNode
            && filter_var($sampleNode['ftpEnabled'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $builtin = [
            self::item('files_sftp', 'ready'),
            self::item('classic_ftp', $ftpEnabled ? 'ready' : 'needs_setup'),
            self::item('backups', 'ready'),
            self::item('schedules', 'ready'),
            self::item('console', 'ready'),
            self::item('subusers', 'ready'),
            self::item('activity', 'ready'),
            self::item('ssl_acme', $proxyReady ? 'ready' : 'needs_proxy'),
            self::item('dns_check', 'ready'),
            self::item('transfer', 'ready'),
            self::item('suspend', 'ready'),
            self::item('php_selector', 'ready'),
            self::item('addon_domains', 'ready'),
            self::item('custom_ssl_upload', 'ready'),
            self::item('dns_hosting', 'ready'),
            self::item('builtin_mail', $mailServerReady ? 'ready' : 'needs_mailserver'),
            self::item('webmail', Roundcube::isInstalled() ? 'partial' : 'needs_setup'),
            self::item('cpu_memory_limits', 'ready'),
            self::item('wordpress_manager', 'ready'),
            self::item('analytics', 'ready'),
            self::item('waf_basic', 'ready'),
        ];

        $setup = [
            self::setupItem(
                'web_nodes',
                $webNodeCount > 0,
                $webNodeCount > 0 ? (string) $webNodeCount . ' node(s)' : 'Add a FeatherQuilld web node',
                $webNodeCount > 0 ? null : ['label' => 'Create web node', 'href' => '/admin/web-nodes/create'],
            ),
            self::setupItem(
                'webplates',
                $webPlateCount > 0,
                $webPlateCount > 0 ? (string) $webPlateCount . ' template(s)' : 'Add WebPlate runtimes (PHP, static, Node…)',
                $webPlateCount > 0 ? null : ['label' => 'Create WebPlate', 'href' => '/admin/webplates/create'],
            ),
            self::setupItem(
                'daemon',
                $daemonHealthy,
                $daemonHealthy
                    ? 'FeatherQuilld reachable' . ($sampleNodeId ? ' (node #' . $sampleNodeId . ')' : '')
                    : 'Daemon not reachable — check token, firewall, Behind Proxy',
                $sampleNodeId ? ['label' => 'Open web node', 'href' => WebNodeAdminUrl::edit($sampleNodeId, 'diagnostics')] : null,
            ),
            self::setupItem(
                'reverse_proxy',
                $proxyReady,
                $proxyReady
                    ? ($proxyProvider ? ucfirst($proxyProvider) . ' detected' : 'Reverse proxy CLI on PATH')
                    : 'Install Caddy, nginx, or Traefik on the web node (match config.yml provider)',
                $sampleNodeId ? ['label' => 'Package manager', 'href' => WebNodeAdminUrl::edit($sampleNodeId, 'packages')] : null,
            ),
            self::setupItem(
                'docker',
                $dockerReady,
                $dockerReady ? 'Docker available for container WebPlates' : 'Install Docker for PHP/app containers',
                $sampleNodeId ? ['label' => 'Package manager', 'href' => WebNodeAdminUrl::edit($sampleNodeId, 'packages')] : null,
            ),
            self::setupItem(
                'acme_email',
                true,
                $nodeAcme !== ''
                    ? 'Site owner emails used for ACME; node fallback configured'
                    : 'Site owner account emails used for ACME (optional node fallback not set)',
                $sampleNodeId ? ['label' => 'Network settings', 'href' => WebNodeAdminUrl::edit($sampleNodeId, 'network')] : null,
            ),
            self::setupItem(
                'database_hosts',
                $databaseHostCount > 0,
                $databaseHostCount > 0
                    ? (string) $databaseHostCount . ' external DB host(s)'
                    : 'Link MySQL/MariaDB/PostgreSQL hosts for customer databases',
                $databaseHostCount > 0 ? null : ['label' => 'Add database host', 'href' => '/admin/databases'],
            ),
            self::setupItem(
                'mail_hosts',
                $mailHostCount > 0,
                $mailHostCount > 0
                    ? (string) $mailHostCount . ' mail host(s) — install Mailserver on web nodes to add more'
                    : 'Install the Mailserver package on a web node (creates a mail host automatically)',
                $mailHostCount > 0
                    ? ['label' => 'View mail', 'href' => '/admin/mail-hosts']
                    : ($sampleNodeId
                        ? ['label' => 'Install Mailserver', 'href' => WebNodeAdminUrl::edit($sampleNodeId, 'packages')]
                        : ['label' => 'Web nodes', 'href' => '/admin/web-nodes']),
            ),
            self::setupItem(
                'dns_hosts',
                $dnsHostCount > 0,
                $dnsHostCount > 0
                    ? (string) $dnsHostCount . ' DNS host(s)'
                    : 'Add a DNS host linked to a web node with PowerDNS installed',
                $dnsHostCount > 0 ? null : ['label' => 'Add DNS host', 'href' => '/admin/dns-hosts'],
            ),
            self::setupItem(
                'first_webspace',
                $webSpaceCount > 0,
                $webSpaceCount > 0 ? (string) $webSpaceCount . ' WebSpace(s) provisioned' : 'Create your first hosted site',
                $webSpaceCount > 0 ? null : ['label' => 'Create WebSpace', 'href' => '/admin/webspaces/create'],
            ),
        ];

        $roadmap = array_values(array_map(
            static fn (array $row): array => ['id' => $row['id'], 'status' => $row['status'] ?? 'planned'],
            array_filter(
                WebSpaceRoadmapFeatures::assess(),
                static fn (array $row): bool => ($row['status'] ?? 'planned') !== 'ready',
            ),
        ));

        $setupReady = count(array_filter($setup, static fn (array $row): bool => ($row['status'] ?? '') === 'ready'));
        $setupTotal = count($setup);
        $score = $setupTotal > 0 ? (int) round(($setupReady / $setupTotal) * 100) : 0;

        $tier = match (true) {
            $score >= 85 && $webSpaceCount > 0 => 'production',
            $score >= 55 => 'staging',
            default => 'bootstrap',
        };

        return [
            'score' => $score,
            'tier' => $tier,
            'summary' => [
                'ready' => $setupReady,
                'setup' => $setupTotal - $setupReady,
                'builtin' => count($builtin),
                'roadmap' => count($roadmap),
            ],
            'builtin' => $builtin,
            'setup' => $setup,
            'roadmap' => $roadmap,
            'sample_node_id' => $sampleNodeId,
        ];
    }

    /**
     * @return ?array<string, mixed>
     */
    private static function resolveSampleNode(?int $preferredWebNodeId): ?array
    {
        if ($preferredWebNodeId !== null && $preferredWebNodeId > 0) {
            $node = WebNode::getWebNodeById($preferredWebNodeId);

            return $node ?: null;
        }

        $nodes = WebNode::getAllWebNodes();
        if ($nodes === []) {
            return null;
        }

        foreach ($nodes as $node) {
            $probe = FeatherQuilldProbe::probeHealth($node);
            if ($probe['status'] === 'healthy') {
                return $node;
            }
        }

        return $nodes[0];
    }

    /**
     * @param array<string, mixed> $diagnostics
     */
    private static function daemonCheckOk(array $diagnostics, string $checkId): bool
    {
        $rows = $diagnostics['checks'] ?? $diagnostics['Checks'] ?? [];
        if (!is_array($rows)) {
            return false;
        }

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $id = (string) ($row['id'] ?? $row['Id'] ?? '');
            if ($id !== $checkId) {
                continue;
            }

            return strtolower((string) ($row['status'] ?? $row['Status'] ?? '')) === 'ok';
        }

        return false;
    }

    /**
     * @param array<string, mixed> $diagnostics
     */
    private static function extractProxyProvider(array $diagnostics): ?string
    {
        $rows = $diagnostics['checks'] ?? $diagnostics['Checks'] ?? [];
        if (!is_array($rows)) {
            return null;
        }

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $id = (string) ($row['id'] ?? $row['Id'] ?? '');
            if ($id !== 'proxy') {
                continue;
            }
            $detail = (string) ($row['detail'] ?? $row['Detail'] ?? '');
            if (preg_match('/provider=(\w+)/', $detail, $m)) {
                return $m[1];
            }
            $message = (string) ($row['message'] ?? $row['Message'] ?? '');
            if (preg_match('/\((\w+)\)/', $message, $m)) {
                return $m[1];
            }
        }

        return null;
    }

    /**
     * @return array{id: string, status: string}
     */
    private static function item(string $id, string $status): array
    {
        return ['id' => $id, 'status' => $status];
    }

    /**
     * @return array{id: string, status: string, detail: ?string, action?: array{label: string, href: string}}
     */
    private static function setupItem(
        string $id,
        bool $ready,
        ?string $detail = null,
        ?array $action = null,
    ): array {
        $row = [
            'id' => $id,
            'status' => $ready ? 'ready' : 'missing',
            'detail' => $detail,
        ];
        if ($action !== null) {
            $row['action'] = $action;
        }

        return $row;
    }
}
