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
use App\Chat\WebSpaceDnsZone;
use App\Services\Dns\DnsProviderInterface;

/**
 * Creates/updates DNS A records for WebSpace domains via PowerDNS on a web node.
 */
class DnsProvisioner
{
    /**
     * @param array<string, mixed> $webNode
     * @param list<string> $domains
     * @param array<string, mixed>|null $space
     *
     * @return array{ok: bool, results: list<array{domain: string, ok: bool, action?: string, error?: string}>, expected_ips: list<string>, source?: string}
     */
    public static function provisionARecords(array $webNode, array $domains, ?array $space = null): array
    {
        $expectedIps = self::resolveNodeIps($webNode);
        if ($expectedIps === []) {
            return [
                'ok' => false,
                'results' => array_map(static fn (string $d): array => [
                    'domain' => $d,
                    'ok' => false,
                    'error' => 'Web node has no resolvable IP/FQDN',
                ], $domains),
                'expected_ips' => [],
            ];
        }

        $targetIp = $expectedIps[0];
        $context = self::resolveProvisionerContext($space);
        if ($context === null) {
            return [
                'ok' => false,
                'results' => [],
                'expected_ips' => $expectedIps,
            ];
        }

        /** @var DnsProviderInterface $provider */
        $provider = $context['provider'];
        $zoneId = (string) $context['zone_id'];

        $results = [];
        $allOk = true;
        foreach ($domains as $domain) {
            $domain = strtolower(trim((string) $domain));
            if ($domain === '') {
                continue;
            }

            $upsert = $provider->upsertARecord($zoneId, $domain, $targetIp);
            if (empty($upsert['ok'])) {
                $allOk = false;
            }
            $results[] = [
                'domain' => $domain,
                'ok' => !empty($upsert['ok']),
                'action' => $upsert['action'] ?? null,
                'error' => $upsert['error'] ?? null,
            ];
        }

        return [
            'ok' => $allOk && $results !== [],
            'results' => $results,
            'expected_ips' => $expectedIps,
            'source' => (string) ($context['source'] ?? 'unknown'),
        ];
    }

    /**
     * @param array<string, mixed> $space
     *
     * @return list<string>
     */
    public static function collectProvisionDomains(array $space): array
    {
        $domains = [];
        $routes = is_array($space['domain_routes'] ?? null) ? $space['domain_routes'] : [];
        if ($routes !== []) {
            foreach ($routes as $route) {
                if (!is_array($route)) {
                    continue;
                }
                $type = strtolower(trim((string) ($route['type'] ?? 'alias')));
                if ($type === 'redirect') {
                    continue;
                }
                $domain = strtolower(trim((string) ($route['domain'] ?? '')));
                if ($domain !== '') {
                    $domains[] = $domain;
                }
            }
        } else {
            foreach (is_array($space['domains'] ?? null) ? $space['domains'] : [] as $domain) {
                $domain = strtolower(trim((string) $domain));
                if ($domain !== '') {
                    $domains[] = $domain;
                }
            }
        }

        return array_values(array_unique($domains));
    }

    /**
     * @param array<string, mixed>|null $space
     *
     * @return array{provider: DnsProviderInterface, zone_id: string, source: string}|null
     */
    public static function resolveProvisionerContext(?array $space = null): ?array
    {
        if ($space === null) {
            return null;
        }

        $primary = WebSpaceDnsZone::getPrimaryForWebspace((int) ($space['id'] ?? 0));
        if ($primary === null) {
            return null;
        }

        $host = DnsHost::getById((int) ($primary['dns_host_id'] ?? 0));
        $provider = $host ? DnsHost::createProvider($host) : null;
        $zoneId = trim((string) ($primary['provider_zone_id'] ?? ''));
        if ($provider === null || $zoneId === '') {
            return null;
        }

        return [
            'provider' => $provider,
            'zone_id' => $zoneId,
            'source' => 'dns_host',
        ];
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return list<string>
     */
    public static function resolveNodeIps(array $webNode): array
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
     * Registrar delegation hints after zone create/link.
     *
     * @param array<string, mixed> $webNode
     *
     * @return array{nameservers: list<string>, glue_ip: ?string, registrar_note: string}
     */
    public static function delegationHint(array $webNode, string $zoneName): array
    {
        $apex = strtolower(trim($zoneName, '.'));
        $ips = self::resolveNodeIps($webNode);

        return [
            'nameservers' => ['ns1.' . $apex],
            'glue_ip' => $ips[0] ?? null,
            'registrar_note' => 'At your registrar, delegate NS to the nameserver hostname(s) above. '
                . 'If glue records are required, point ns1.' . $apex . ' to the web node IP. '
                . 'Open port 53/tcp+udp on the web node firewall.',
        ];
    }

    /**
     * @param array<string, mixed> $dnsHost
     * @param array<string, mixed> $webSpace
     */
    public static function assertDnsHostMatchesWebSpace(array $dnsHost, array $webSpace): ?string
    {
        $hostNodeId = (int) ($dnsHost['web_node_id'] ?? 0);
        $spaceNodeId = (int) ($webSpace['web_node_id'] ?? 0);
        if ($hostNodeId <= 0 || $hostNodeId !== $spaceNodeId) {
            return 'DNS host must belong to the same web node as this WebSpace';
        }

        return null;
    }

    public static function webNodeHasDnsHost(int $webNodeId): bool
    {
        if ($webNodeId <= 0) {
            return false;
        }

        foreach (DnsHost::listAll() as $host) {
            if ((int) ($host['web_node_id'] ?? 0) === $webNodeId) {
                return true;
            }
        }

        return false;
    }

    /**
     * Write MX/SPF/DKIM records for node-mode mail when a DNS zone is linked.
     *
     * @param array<string, mixed> $webSpace
     * @param array<string, mixed> $mailHost
     *
     * @return array{ok: bool, results: list<array{type: string, name: string, ok: bool, action?: string, error?: string}>, skipped?: bool, error?: string}
     */
    public static function provisionMailRecords(array $webSpace, array $mailHost, string $domain): array
    {
        $mode = strtolower(trim((string) ($mailHost['provision_mode'] ?? '')));
        if ($mode !== 'node') {
            return ['ok' => true, 'results' => [], 'skipped' => true];
        }

        $domain = strtolower(trim($domain));
        if ($domain === '') {
            return ['ok' => false, 'results' => [], 'error' => 'domain is required'];
        }

        $context = self::resolveProvisionerContext($webSpace);
        if ($context === null) {
            return ['ok' => false, 'results' => [], 'error' => 'No linked DNS zone for this WebSpace'];
        }

        $webNodeId = (int) ($webSpace['web_node_id'] ?? 0);
        $webNode = WebNode::getWebNodeById($webNodeId);
        if (!$webNode) {
            return ['ok' => false, 'results' => [], 'error' => 'Web node not found'];
        }

        $hints = FeatherQuilldClient::getMailDnsHints($webNode, $domain);
        if (!$hints['ok'] || !is_array($hints['body'])) {
            return [
                'ok' => false,
                'results' => [],
                'error' => is_string($hints['error'] ?? null) ? $hints['error'] : 'Failed to load mail DNS hints from daemon',
            ];
        }

        $records = is_array($hints['body']['records'] ?? null) ? $hints['body']['records'] : [];
        /** @var DnsProviderInterface $provider */
        $provider = $context['provider'];
        $zoneId = (string) $context['zone_id'];

        $results = [];
        $allOk = true;
        foreach ($records as $record) {
            if (!is_array($record)) {
                continue;
            }

            $type = strtoupper(trim((string) ($record['type'] ?? '')));
            $name = trim((string) ($record['name'] ?? '@'));
            $value = trim((string) ($record['value'] ?? ''));
            $priority = (int) ($record['priority'] ?? 10);

            if ($type === '' || $value === '') {
                continue;
            }

            if ($type === 'MX') {
                $upsert = $provider instanceof \App\Services\Dns\NodeDnsProvider
                    ? $provider->upsertMxRecord($zoneId, $name === '@' ? $domain : $name, $value, $priority)
                    : ['ok' => false, 'error' => 'MX provisioning requires node DNS provider'];
            } elseif ($type === 'TXT') {
                $txtName = $name === '@' ? $domain : ($name . '.' . $domain);
                $upsert = $provider->createTxtRecord($zoneId, $txtName, $value);
            } else {
                continue;
            }

            if (empty($upsert['ok'])) {
                $allOk = false;
            }

            $results[] = [
                'type' => $type,
                'name' => $name,
                'ok' => !empty($upsert['ok']),
                'action' => $upsert['action'] ?? null,
                'error' => $upsert['error'] ?? null,
            ];
        }

        $mxHost = trim((string) ($hints['body']['mx_host'] ?? ''));
        $mailHostId = (int) ($mailHost['id'] ?? 0);
        $dkimReady = !empty($hints['body']['dkim_ready']);
        $dkimSelector = trim((string) ($hints['body']['dkim_selector'] ?? ''));
        $dkimRecord = trim((string) ($hints['body']['dkim_record'] ?? ''));
        if ($mailHostId > 0) {
            $update = [];
            if ($mxHost !== '') {
                $update['mx_host'] = rtrim($mxHost, '.');
                $update['spf_record'] = self::findHintValue($records, 'TXT', '@');
            }
            if ($dkimReady && $dkimSelector !== '' && $dkimRecord !== '') {
                $update['dkim_selector'] = $dkimSelector;
                $update['dkim_record'] = $dkimRecord;
            }
            if ($update !== []) {
                MailHost::update($mailHostId, $update);
            }
        }

        $dmarcValue = self::findHintValue($records, 'TXT', '_dmarc');
        if ($dmarcValue === null) {
            $dmarcValue = trim((string) ($hints['body']['dmarc_record'] ?? ''));
        }
        if ($dmarcValue !== '') {
            $hasDmarc = false;
            foreach ($results as $result) {
                if (
                    ($result['type'] ?? '') === 'TXT'
                    && ($result['name'] ?? '') === '_dmarc'
                    && !empty($result['ok'])
                ) {
                    $hasDmarc = true;
                    break;
                }
            }
            if (!$hasDmarc) {
                $upsert = $provider->createTxtRecord($zoneId, '_dmarc.' . $domain, $dmarcValue);
                if (empty($upsert['ok'])) {
                    $allOk = false;
                }
                $results[] = [
                    'type' => 'TXT',
                    'name' => '_dmarc',
                    'ok' => !empty($upsert['ok']),
                    'action' => $upsert['action'] ?? null,
                    'error' => $upsert['error'] ?? null,
                ];
            }
        }

        return [
            'ok' => $allOk && $results !== [],
            'results' => $results,
            'dkim_ready' => $dkimReady,
        ];
    }

    /**
     * @param array<string, mixed> $space
     *
     * @return list<array{domain: string, ok: bool, skipped?: bool, error?: string}>
     */
    public static function provisionMailForWebSpace(array $space): array
    {
        return MailDeliverabilityChecker::provisionMailForWebSpace($space);
    }

    /**
     * @param list<mixed> $records
     */
    private static function findHintValue(array $records, string $type, string $name): ?string
    {
        foreach ($records as $record) {
            if (!is_array($record)) {
                continue;
            }
            if (
                strtoupper((string) ($record['type'] ?? '')) === $type
                && trim((string) ($record['name'] ?? '')) === $name
            ) {
                $value = trim((string) ($record['value'] ?? ''));

                return $value !== '' ? $value : null;
            }
        }

        return null;
    }
}
