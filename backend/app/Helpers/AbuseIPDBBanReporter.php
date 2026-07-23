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

use App\App;
use App\Services\AbuseIPDB\AbuseIPDBService;

class AbuseIPDBBanReporter
{
    /**
     * Report a banned user's IP(s) to AbuseIPDB when requested.
     *
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body Request body (report_to_abuseipdb, abuseipdb_categories, abuseipdb_comment)
     * @param string $banReason Human-readable ban reason
     *
     * @return array{attempted: bool, reported: list<array{ip: string, success: bool, error?: string, score?: int}>}
     */
    public static function maybeReport(array $user, array $body, string $banReason = ''): array
    {
        $wantsReport = filter_var($body['report_to_abuseipdb'] ?? false, FILTER_VALIDATE_BOOLEAN);
        if (!$wantsReport) {
            return ['attempted' => false, 'reported' => []];
        }

        $service = new AbuseIPDBService();
        if (!$service->isConfigured()) {
            App::getInstance(true)->getLogger()->warning(
                'AbuseIPDB ban report skipped: integration not configured'
            );

            return [
                'attempted' => true,
                'reported' => [[
                    'ip' => '',
                    'success' => false,
                    'error' => 'AbuseIPDB is not enabled or API key is missing',
                ]],
            ];
        }

        $categories = $service->normalizeCategories($body['abuseipdb_categories'] ?? []);
        if ($categories === []) {
            return [
                'attempted' => true,
                'reported' => [[
                    'ip' => '',
                    'success' => false,
                    'error' => 'At least one AbuseIPDB category is required to report',
                ]],
            ];
        }

        $comment = trim((string) ($body['abuseipdb_comment'] ?? ''));
        if ($comment === '') {
            $username = (string) ($user['username'] ?? 'unknown');
            $comment = 'User "' . $username . '" banned on FeatherPanel.';
            if (trim($banReason) !== '') {
                $comment .= ' Reason: ' . trim($banReason);
            }
        }

        $ips = [];
        foreach (['last_ip', 'first_ip'] as $field) {
            $candidate = trim((string) ($user[$field] ?? ''));
            if ($candidate !== '' && AbuseIPDBService::isPublicIp($candidate)) {
                $ips[$candidate] = $candidate;
            }
        }
        $ips = array_values($ips);

        if ($ips === []) {
            return [
                'attempted' => true,
                'reported' => [[
                    'ip' => '',
                    'success' => false,
                    'error' => 'User has no public IP address to report',
                ]],
            ];
        }

        $reported = [];
        foreach ($ips as $ip) {
            $result = $service->report($ip, $categories, $comment);
            if ($result['success']) {
                $reported[] = [
                    'ip' => $ip,
                    'success' => true,
                    'score' => (int) ($result['data']['abuseConfidenceScore'] ?? 0),
                ];
                App::getInstance(true)->getLogger()->info(
                    'Reported IP ' . $ip . ' to AbuseIPDB after ban of user '
                    . ($user['uuid'] ?? 'unknown')
                );
            } else {
                $reported[] = [
                    'ip' => $ip,
                    'success' => false,
                    'error' => (string) ($result['error'] ?? 'Report failed'),
                ];
            }
        }

        return ['attempted' => true, 'reported' => $reported];
    }
}
