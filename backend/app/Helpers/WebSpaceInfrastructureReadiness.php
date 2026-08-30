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

use App\Chat\DatabaseInstance;
use App\Chat\DnsHost;
use App\Chat\MailHost;
use App\Chat\User;
use App\Chat\WebNode;
use App\Chat\WebPlate;

/**
 * Aggregates panel + FeatherQuilld readiness for WebSpace provisioning.
 */
class WebSpaceInfrastructureReadiness
{
    /**
     * ACME contact for a site: owner account email, else node operator fallback.
     *
     * @param array<string, mixed>|null $ownerOrSpace owner user row or hydrated webspace
     * @param array<string, mixed>|null $webNode
     */
    public static function resolveAcmeEmail(?array $ownerOrSpace, ?array $webNode = null): string
    {
        $ownerEmail = trim((string) ($ownerOrSpace['owner_email'] ?? $ownerOrSpace['email'] ?? ''));
        if ($ownerEmail === '' && (int) ($ownerOrSpace['owner_id'] ?? 0) > 0) {
            $owner = User::getUserById((int) $ownerOrSpace['owner_id']);
            $ownerEmail = trim((string) ($owner['email'] ?? ''));
        }
        if ($ownerEmail !== '') {
            return $ownerEmail;
        }

        return trim((string) ($webNode['acmeEmail'] ?? ''));
    }

    /**
     * @param array<string, mixed>|null $ownerOrSpace
     * @param array<string, mixed>|null $webNode
     */
    public static function hasAcmeContact(?array $ownerOrSpace, ?array $webNode = null): bool
    {
        return self::resolveAcmeEmail($ownerOrSpace, $webNode) !== '';
    }

    /**
     * @return array{
     *   ready: bool,
     *   status: string,
     *   checks: list<array{id: string, status: string, message: string, detail: ?string, action?: array{label: string, href: string}}>,
     *   counts: array{web_nodes: int, webplates: int, database_hosts: int, mail_hosts: int},
     *   web_node_id: ?int,
     *   daemon: ?array<string, mixed>
     * }
     */
    public static function inspect(
        ?int $webNodeId = null,
        bool $ssl = false,
        int $databaseLimit = 0,
        int $mailboxLimit = 0,
        bool $hasDomains = false,
    ): array {
        $checks = [];
        $webNodeCount = WebNode::count([]);
        $webPlateCount = WebPlate::countAll();

        $checks[] = self::check(
            'web_nodes',
            $webNodeCount > 0 ? 'ok' : 'fail',
            $webNodeCount > 0 ? 'Web node configured' : 'No web nodes configured',
            $webNodeCount > 0 ? (string) $webNodeCount . ' web node(s)' : 'Add a FeatherQuilld web node first',
            $webNodeCount > 0 ? null : ['label' => 'Create web node', 'href' => '/admin/web-nodes/create'],
        );

        $checks[] = self::check(
            'webplates',
            $webPlateCount > 0 ? 'ok' : 'fail',
            $webPlateCount > 0 ? 'WebPlate available' : 'No WebPlates configured',
            $webPlateCount > 0 ? (string) $webPlateCount . ' WebPlate(s)' : 'Add a WebPlate template before provisioning sites',
            $webPlateCount > 0 ? null : ['label' => 'Create WebPlate', 'href' => '/admin/webplates/create'],
        );

        $databaseHostCount = 0;
        $mailHostCount = 0;
        $daemonPayload = null;
        $webNode = null;
        $nodeMeta = null;
        $proxyProvider = null;

        if ($webNodeId !== null && $webNodeId > 0) {
            $webNode = WebNode::getWebNodeById($webNodeId);
            if (!$webNode) {
                $checks[] = self::check(
                    'web_node',
                    'fail',
                    'Selected web node not found',
                    'web_node_id=' . $webNodeId,
                    ['label' => 'Manage web nodes', 'href' => '/admin/web-nodes'],
                );
            } else {
                $expectedIps = self::resolveNodeIps($webNode);
                $nodeMeta = [
                    'id' => $webNodeId,
                    'fqdn' => (string) ($webNode['fqdn'] ?? ''),
                    'expected_ips' => $expectedIps,
                    'behind_proxy' => !empty($webNode['behind_proxy']),
                    'proxy_provider' => null,
                ];

                $databaseHostCount = count(DatabaseInstance::getDatabasesForWebNode($webNodeId));
                $mailHostCount = count(MailHost::listForWebNode($webNodeId));

                $health = FeatherQuilldProbe::probeHealth($webNode);
                if ($health['status'] !== 'healthy') {
                    $checks[] = self::check(
                        'daemon',
                        'fail',
                        'FeatherQuilld daemon unreachable',
                        $health['error'] ?? 'Health probe failed',
                        ['label' => 'Open web node', 'href' => WebNodeAdminUrl::edit($webNodeId, 'diagnostics')],
                    );
                } else {
                    $checks[] = self::check(
                        'daemon',
                        'ok',
                        'FeatherQuilld daemon healthy',
                        (string) ($webNode['fqdn'] ?? ''),
                    );

                    $diag = FeatherQuilldClient::getDiagnostics($webNode);
                    if ($diag['ok'] && is_array($diag['body'])) {
                        $daemonPayload = $diag['body'];
                        $proxyProvider = self::extractProxyProvider($diag['body']);
                        if ($nodeMeta !== null) {
                            $nodeMeta['proxy_provider'] = $proxyProvider;
                        }
                        $checks = array_merge($checks, self::checksFromDaemonDiagnostics($diag['body'], $webNodeId, $proxyProvider));
                    } else {
                        $checks[] = self::check(
                            'daemon_diagnostics',
                            'warn',
                            'Could not load daemon diagnostics',
                            $diag['error'] ?? 'Diagnostics request failed',
                        );
                    }
                }

                if ($ssl) {
                    $nodeEmail = trim((string) ($webNode['acmeEmail'] ?? ''));
                    $provider = strtolower(trim((string) ($proxyProvider ?? $webNode['proxyProvider'] ?? 'caddy')));
                    if ($provider === 'traefik' && $nodeEmail === '') {
                        $checks[] = self::check(
                            'panel_acme_email',
                            'warn',
                            'Traefik uses the web node ACME email',
                            'Set a fallback acmeEmail on the web node — Traefik cannot use per-site owner emails',
                            ['label' => 'Network settings', 'href' => WebNodeAdminUrl::edit($webNodeId, 'network')],
                        );
                    } elseif ($nodeEmail !== '') {
                        $checks[] = self::check(
                            'panel_acme_email',
                            'ok',
                            'HTTPS uses the site owner\'s account email; node fallback configured',
                            $nodeEmail,
                        );
                    } else {
                        $checks[] = self::check(
                            'panel_acme_email',
                            'ok',
                            'HTTPS uses the site owner\'s account email',
                            'Node acmeEmail is optional operator fallback',
                        );
                    }
                }

                if (!empty($webNode['behind_proxy'])) {
                    $checks[] = self::check(
                        'behind_proxy',
                        'ok',
                        'Web node marked behind reverse proxy',
                        'Console WebSockets use wss:// without :8989',
                    );
                } else {
                    $checks[] = self::check(
                        'behind_proxy',
                        'ok',
                        'Direct FeatherQuilld access',
                        'Enable Behind Proxy on the web node if the daemon is only reachable via nginx/Caddy on 443',
                        ['label' => 'Network settings', 'href' => WebNodeAdminUrl::edit($webNodeId, 'network')],
                    );
                }
                if ($ssl && !$hasDomains) {
                    $checks[] = self::check(
                        'domains',
                        'warn',
                        'SSL enabled but no domains configured',
                        'Add at least one domain before certificates can be issued',
                        null,
                        'proxy',
                    );
                }

                if ($hasDomains && $proxyProvider !== null) {
                    $checks[] = self::check(
                        'proxy_provider',
                        'ok',
                        'Reverse proxy provider: ' . $proxyProvider,
                        self::proxyInstallHint($proxyProvider),
                        null,
                        'proxy',
                    );
                }
            }
        }

        if ($databaseLimit > 0) {
            $checks[] = self::check(
                'database_hosts',
                $databaseHostCount > 0 ? 'ok' : 'warn',
                $databaseHostCount > 0 ? 'Database host available' : 'No database hosts for this web node',
                $databaseHostCount > 0
                    ? (string) $databaseHostCount . ' host(s) linked'
                    : 'Add a database host in Admin → Databases before customers can create DBs',
                $databaseHostCount > 0 ? null : ['label' => 'Add database host', 'href' => '/admin/databases'],
                'services',
            );
        }

        if ($mailboxLimit > 0) {
            $checks[] = self::check(
                'mail_hosts',
                $mailHostCount > 0 ? 'ok' : 'warn',
                $mailHostCount > 0 ? 'Mail host available' : 'No mail hosts for this web node',
                $mailHostCount > 0
                    ? (string) $mailHostCount . ' host(s) linked'
                    : 'Add a mail host in Admin → Mail before customers can create mailboxes',
                $mailHostCount > 0 ? null : ['label' => 'Add mail host', 'href' => '/admin/mail-hosts'],
                'services',
            );
        }

        $hasFail = self::hasStatus($checks, 'fail');
        $hasWarn = self::hasStatus($checks, 'warn');
        $summary = self::summarize($checks);

        return [
            'ready' => !$hasFail,
            'status' => $hasFail ? 'blocked' : ($hasWarn ? 'warning' : 'ready'),
            'summary' => $summary,
            'checks' => $checks,
            'counts' => [
                'web_nodes' => $webNodeCount,
                'webplates' => $webPlateCount,
                'database_hosts' => $databaseHostCount,
                'mail_hosts' => $mailHostCount,
            ],
            'node' => $nodeMeta,
            'web_node_id' => $webNodeId,
            'daemon' => $daemonPayload,
        ];
    }

    /**
     * Critical checks that must pass before provisioning a new WebSpace.
     *
     * @return array{
     *   ready: bool,
     *   checks: list<array{id: string, status: string, message: string, detail: ?string, action?: array{label: string, href: string}}>,
     *   inspection: array<string, mixed>
     * }
     */
    public static function blockingForCreate(
        ?int $webNodeId = null,
        bool $ssl = false,
        string $runtime = 'static',
    ): array {
        $inspection = self::inspect($webNodeId, $ssl, 0, 0, false);
        $blockingIds = ['web_nodes', 'webplates', 'web_node', 'daemon', 'daemon_proxy_binary'];
        if ($ssl) {
            $blockingIds[] = 'panel_acme_email';
        }
        if (strtolower(trim($runtime)) !== 'static') {
            $blockingIds[] = 'daemon_docker';
        }

        $blocked = [];
        $dnsHostOnNode = $webNodeId !== null && $webNodeId > 0 && DnsProvisioner::webNodeHasDnsHost($webNodeId);
        $nodeMailOnNode = $webNodeId !== null && $webNodeId > 0 && MailHost::webNodeHasNodeMailHost($webNodeId);
        foreach ($inspection['checks'] as $check) {
            $id = (string) ($check['id'] ?? '');
            $status = (string) ($check['status'] ?? '');
            if ($status === 'fail' && in_array($id, $blockingIds, true)) {
                $blocked[] = $check;
                continue;
            }
            if ($dnsHostOnNode && $id === 'daemon_powerdns' && $status !== 'ok') {
                $blocked[] = $check;
                continue;
            }
            if ($nodeMailOnNode && $id === 'daemon_mailserver' && $status !== 'ok') {
                $blocked[] = $check;
            }
        }

        return [
            'ready' => $blocked === [],
            'checks' => $blocked,
            'inspection' => $inspection,
        ];
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return list<string>
     */
    private static function resolveNodeIps(array $webNode): array
    {
        $expectedIps = [];
        foreach (['public_ip', 'ip', 'fqdn'] as $key) {
            $val = trim((string) ($webNode[$key] ?? ''));
            if ($val === '') {
                continue;
            }
            if (filter_var($val, FILTER_VALIDATE_IP)) {
                $expectedIps[] = $val;
            } else {
                $resolved = @gethostbynamel($val) ?: [];
                foreach ($resolved as $ip) {
                    $expectedIps[] = $ip;
                }
            }
        }

        return array_values(array_unique($expectedIps));
    }

    /**
     * @param array<string, mixed> $diagnostics
     */
    private static function extractProxyProvider(array $diagnostics): ?string
    {
        $daemonChecks = $diagnostics['checks'] ?? $diagnostics['Checks'] ?? [];
        if (!is_array($daemonChecks)) {
            return null;
        }

        foreach ($daemonChecks as $row) {
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

    private static function proxyInstallHint(string $provider): string
    {
        return match (strtolower($provider)) {
            'nginx' => 'Install nginx on the web node: apt install nginx (Debian/Ubuntu) or dnf install nginx (RHEL).',
            'traefik' => 'Traefik watches the dynamic config file — ensure the traefik service is running.',
            default => 'Install Caddy: apt install caddy or see caddyserver.com/docs/install.',
        };
    }

    /**
     * @param array<string, mixed> $diagnostics
     *
     * @return list<array{id: string, status: string, message: string, detail: ?string, action?: array{label: string, href: string}, category?: string}>
     */
    private static function checksFromDaemonDiagnostics(array $diagnostics, int $webNodeId, ?string $proxyProvider): array
    {
        $daemonChecks = $diagnostics['checks'] ?? $diagnostics['Checks'] ?? [];
        if (!is_array($daemonChecks)) {
            return [];
        }

        $mapped = [];
        $interesting = [
            'proxy.binary' => ['fail' => 'Reverse proxy not installed', 'warn' => 'Reverse proxy issue'],
            'proxy.acme_email' => ['fail' => 'Daemon ACME email missing', 'warn' => 'Daemon ACME email missing'],
            'docker.cli' => ['fail' => 'Docker not available', 'warn' => 'Docker issue'],
            'docker_network' => ['fail' => 'Docker network not ready', 'warn' => 'Docker network issue'],
            'dns.powerdns' => ['fail' => 'PowerDNS not available', 'warn' => 'PowerDNS not ready'],
            'mail.stack' => ['fail' => 'Mail server not available', 'warn' => 'Mail server not ready'],
            'panel' => ['warn' => 'Panel credentials missing on daemon'],
        ];

        foreach ($daemonChecks as $row) {
            if (!is_array($row)) {
                continue;
            }

            $id = (string) ($row['id'] ?? $row['Id'] ?? '');
            if ($id === '' || !isset($interesting[$id])) {
                continue;
            }

            $status = strtolower((string) ($row['status'] ?? $row['Status'] ?? 'ok'));
            if ($status === 'ok') {
                if ($id === 'proxy.binary') {
                    $mapped[] = self::check(
                        'daemon_proxy_binary',
                        'ok',
                        'Reverse proxy CLI found on web node',
                        isset($row['detail']) ? (string) $row['detail'] : (isset($row['Detail']) ? (string) $row['Detail'] : null),
                    );
                } elseif ($id === 'docker.cli') {
                    $mapped[] = self::check(
                        'daemon_docker',
                        'ok',
                        'Docker available on web node',
                        isset($row['detail']) ? (string) $row['detail'] : null,
                    );
                } elseif ($id === 'dns.powerdns') {
                    $mapped[] = self::check(
                        'daemon_powerdns',
                        'ok',
                        'PowerDNS available on web node',
                        isset($row['detail']) ? (string) $row['detail'] : null,
                    );
                } elseif ($id === 'mail.stack') {
                    $mapped[] = self::check(
                        'daemon_mailserver',
                        'ok',
                        'Mail server available on web node',
                        isset($row['detail']) ? (string) $row['detail'] : null,
                        null,
                        'mail',
                    );
                }
                continue;
            }

            $message = (string) ($row['message'] ?? $row['Message'] ?? $interesting[$id][$status] ?? $id);
            $detail = isset($row['detail']) ? (string) $row['detail'] : (isset($row['Detail']) ? (string) $row['Detail'] : null);
            $panelId = match ($id) {
                'proxy.binary' => 'daemon_proxy_binary',
                'proxy.acme_email' => 'daemon_acme_email',
                'docker.cli' => 'daemon_docker',
                'docker_network' => 'daemon_docker_network',
                'dns.powerdns' => 'daemon_powerdns',
                'mail.stack' => 'daemon_mailserver',
                'panel' => 'daemon_panel_credentials',
                default => 'daemon_' . str_replace('.', '_', $id),
            };

            $action = null;
            if ($id === 'proxy.binary') {
                $provider = $proxyProvider ?? 'caddy';
                $action = [
                    'label' => 'Package manager',
                    'href' => WebNodeAdminUrl::edit($webNodeId, 'packages'),
                ];
                if ($detail === null || $detail === '') {
                    $detail = self::proxyInstallHint($provider);
                }
            } elseif ($id === 'dns.powerdns') {
                $action = [
                    'label' => 'Install PowerDNS',
                    'href' => WebNodeAdminUrl::edit($webNodeId, 'packages'),
                ];
                if ($detail === null || $detail === '') {
                    $detail = 'Install the powerdns package on the web node for self-hosted DNS zones.';
                }
            } elseif ($id === 'mail.stack') {
                $action = [
                    'label' => 'Install mailserver',
                    'href' => WebNodeAdminUrl::edit($webNodeId, 'packages'),
                ];
                if ($detail === null || $detail === '') {
                    $detail = 'Install the mailserver package on the web node for built-in mailboxes.';
                }
            }

            $category = match ($id) {
                'dns.powerdns' => 'dns',
                'mail.stack' => 'mail',
                default => 'proxy',
            };
            $mapped[] = self::check($panelId, $status === 'fail' ? 'fail' : 'warn', $message, $detail, $action, $category);
        }

        return $mapped;
    }

    /**
     * @param list<array{id: string, status: string, message: string, detail: ?string, action?: array{label: string, href: string}, category?: string}> $checks
     *
     * @return array{total: int, ok: int, warn: int, fail: int}
     */
    private static function summarize(array $checks): array
    {
        $summary = ['total' => 0, 'ok' => 0, 'warn' => 0, 'fail' => 0];
        foreach ($checks as $check) {
            $summary['total']++;
            $status = (string) ($check['status'] ?? 'ok');
            if ($status === 'fail') {
                $summary['fail']++;
            } elseif ($status === 'warn') {
                $summary['warn']++;
            } else {
                $summary['ok']++;
            }
        }

        return $summary;
    }

    /**
     * @param list<array{id: string, status: string, message: string, detail: ?string, action?: array{label: string, href: string}, category?: string}> $checks
     */
    private static function hasStatus(array $checks, string $status): bool
    {
        foreach ($checks as $check) {
            if (($check['status'] ?? '') === $status) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array{id: string, status: string, message: string, detail: ?string, action?: array{label: string, href: string}, category?: string}
     */
    private static function check(
        string $id,
        string $status,
        string $message,
        ?string $detail = null,
        ?array $action = null,
        ?string $category = null,
    ): array {
        $row = [
            'id' => $id,
            'status' => $status,
            'message' => $message,
            'detail' => $detail,
        ];
        if ($action !== null) {
            $row['action'] = $action;
        }
        if ($category !== null) {
            $row['category'] = $category;
        }

        return $row;
    }
}
