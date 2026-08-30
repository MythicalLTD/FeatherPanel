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

use App\Chat\MailHost;

/**
 * Per-domain mail deliverability checks for WebSpace email UI.
 */
class MailDeliverabilityChecker
{
    /**
     * @param array<string, mixed> $space
     * @param list<mixed> $zoneRecords
     *
     * @return array{
     *   domain: string,
     *   checks: list<array{id: string, status: string, label: string, detail?: string|null, fixable?: bool}>,
     *   overall: string
     * }
     */
    public static function assessDomain(
        array $space,
        string $domain,
        ?array $mailHost,
        array $zoneRecords,
        ?array $daemonDeliverability = null,
    ): array {
        $domain = strtolower(trim($domain));
        $mxHost = $mailHost
            ? rtrim((string) ($mailHost['mx_host'] ?: $mailHost['hostname']), '.')
            : 'mail.' . $domain;
        $spfExpected = $mailHost && !empty($mailHost['spf_record'])
            ? (string) $mailHost['spf_record']
            : 'v=spf1 mx a:' . $mxHost . ' -all';
        $dkimSelector = $mailHost ? trim((string) ($mailHost['dkim_selector'] ?? '')) : '';
        $dkimRecord = $mailHost ? trim((string) ($mailHost['dkim_record'] ?? '')) : '';
        $dmarcExpected = 'v=DMARC1; p=none; rua=mailto:postmaster@' . $domain;

        $checks = [
            self::checkRecord($zoneRecords, $domain, 'mx', 'MX', '@', $mxHost, true),
            self::checkTxtContains($zoneRecords, $domain, 'spf', '@', 'v=spf1', $spfExpected, true),
            self::checkDkim($zoneRecords, $domain, $dkimSelector, $dkimRecord, true),
            self::checkTxtContains($zoneRecords, $domain, 'dmarc', '_dmarc', 'v=DMARC1', $dmarcExpected, true),
        ];

        if (is_array($daemonDeliverability)) {
            $ports = is_array($daemonDeliverability['ports'] ?? null) ? $daemonDeliverability['ports'] : [];
            $mailPortsOk = !empty($ports['smtp_25']) && !empty($ports['submission']) && !empty($ports['imap']);
            $checks[] = [
                'id' => 'mail_ports',
                'status' => $mailPortsOk ? 'pass' : 'fail',
                'label' => 'Mail ports (25/587/993)',
                'detail' => $mailPortsOk
                    ? null
                    : 'SMTP submission or IMAP is not listening on the web node.',
                'fixable' => false,
            ];

            $ptr = is_array($daemonDeliverability['ptr'] ?? null) ? $daemonDeliverability['ptr'] : [];
            $ptrStatus = (string) ($ptr['status'] ?? 'warn');
            $checks[] = [
                'id' => 'ptr',
                'status' => $ptrStatus === 'pass' ? 'pass' : 'warn',
                'label' => 'PTR / rDNS',
                'detail' => $ptr['detail'] ?? 'Verify reverse DNS with your host provider.',
                'fixable' => false,
            ];
        }

        $overall = 'pass';
        foreach ($checks as $check) {
            if (($check['status'] ?? '') === 'fail') {
                $overall = 'fail';
                break;
            }
            if (($check['status'] ?? '') === 'warn' && $overall === 'pass') {
                $overall = 'warn';
            }
        }

        return [
            'domain' => $domain,
            'checks' => $checks,
            'overall' => $overall,
        ];
    }

    /**
     * @param array<string, mixed> $space
     *
     * @return list<array{domain: string, ok: bool, skipped?: bool, error?: string}>
     */
    public static function provisionMailForWebSpace(array $space): array
    {
        $webNodeId = (int) ($space['web_node_id'] ?? 0);
        $hosts = MailHost::listForWebNode($webNodeId);
        $mailHost = null;
        foreach ($hosts as $host) {
            if (strtolower(trim((string) ($host['provision_mode'] ?? ''))) === 'node') {
                $mailHost = $host;
                break;
            }
        }
        if ($mailHost === null) {
            return [];
        }

        $results = [];
        foreach (DnsProvisioner::collectProvisionDomains($space) as $domain) {
            try {
                $result = DnsProvisioner::provisionMailRecords($space, $mailHost, $domain);
                $results[] = [
                    'domain' => $domain,
                    'ok' => !empty($result['ok']),
                    'skipped' => !empty($result['skipped']),
                    'error' => $result['error'] ?? null,
                ];
            } catch (\Throwable $e) {
                $results[] = [
                    'domain' => $domain,
                    'ok' => false,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $results;
    }

    /**
     * @param list<mixed> $zoneRecords
     *
     * @return array{id: string, status: string, label: string, detail?: string|null, fixable: bool}
     */
    private static function checkRecord(
        array $zoneRecords,
        string $domain,
        string $id,
        string $type,
        string $name,
        string $expectedValue,
        bool $fixable,
    ): array {
        $found = self::findZoneRecord($zoneRecords, $domain, $type, $name, $expectedValue);

        return [
            'id' => $id,
            'status' => $found ? 'pass' : 'fail',
            'label' => strtoupper($type) . ' ' . ($name === '@' ? '@' : $name),
            'detail' => $found ? null : 'Expected ' . $expectedValue,
            'fixable' => $fixable,
        ];
    }

    /**
     * @param list<mixed> $zoneRecords
     *
     * @return array{id: string, status: string, label: string, detail?: string|null, fixable: bool}
     */
    private static function checkTxtContains(
        array $zoneRecords,
        string $domain,
        string $id,
        string $name,
        string $needle,
        string $expectedValue,
        bool $fixable,
    ): array {
        $fqdn = $name === '@' ? $domain : ($name . '.' . $domain);
        foreach ($zoneRecords as $record) {
            if (!is_array($record)) {
                continue;
            }
            if (strtoupper((string) ($record['type'] ?? '')) !== 'TXT') {
                continue;
            }
            $recordName = strtolower(rtrim((string) ($record['name'] ?? ''), '.'));
            if ($recordName !== strtolower(rtrim($fqdn, '.')) && $recordName !== strtolower(rtrim($domain, '.'))) {
                continue;
            }
            $content = trim((string) ($record['content'] ?? ''));
            if ($content !== '' && stripos($content, $needle) !== false) {
                return [
                    'id' => $id,
                    'status' => 'pass',
                    'label' => strtoupper($id),
                    'detail' => null,
                    'fixable' => $fixable,
                ];
            }
        }

        return [
            'id' => $id,
            'status' => 'fail',
            'label' => strtoupper($id),
            'detail' => 'Expected ' . $expectedValue,
            'fixable' => $fixable,
        ];
    }

    /**
     * @param list<mixed> $zoneRecords
     *
     * @return array{id: string, status: string, label: string, detail?: string|null, fixable: bool}
     */
    private static function checkDkim(
        array $zoneRecords,
        string $domain,
        string $selector,
        string $recordValue,
        bool $fixable,
    ): array {
        if ($selector === '' || $recordValue === '') {
            return [
                'id' => 'dkim',
                'status' => 'warn',
                'label' => 'DKIM',
                'detail' => 'DKIM keys are not ready yet — retry DNS provision shortly.',
                'fixable' => $fixable,
            ];
        }

        $found = self::findZoneRecord($zoneRecords, $domain, 'TXT', $selector . '._domainkey', $recordValue);

        return [
            'id' => 'dkim',
            'status' => $found ? 'pass' : 'fail',
            'label' => 'DKIM',
            'detail' => $found ? null : 'DKIM TXT record missing in linked zone.',
            'fixable' => $fixable,
        ];
    }

    /**
     * @param list<mixed> $zoneRecords
     */
    private static function findZoneRecord(
        array $zoneRecords,
        string $domain,
        string $type,
        string $name,
        string $expectedValue,
    ): bool {
        $fqdn = $name === '@' ? $domain : ($name . '.' . $domain);
        foreach ($zoneRecords as $record) {
            if (!is_array($record)) {
                continue;
            }
            if (strtoupper((string) ($record['type'] ?? '')) !== strtoupper($type)) {
                continue;
            }
            $recordName = strtolower(rtrim((string) ($record['name'] ?? ''), '.'));
            if ($recordName !== strtolower(rtrim($fqdn, '.')) && $recordName !== strtolower(rtrim($domain, '.'))) {
                continue;
            }

            if (strtoupper($type) === 'MX') {
                if (rtrim((string) ($record['content'] ?? ''), '.') === rtrim($expectedValue, '.')) {
                    return true;
                }
            } elseif (strtoupper($type) === 'TXT') {
                $content = trim((string) ($record['content'] ?? ''));
                if ($content === $expectedValue || str_contains($content, $expectedValue)) {
                    return true;
                }
            }
        }

        return false;
    }
}
