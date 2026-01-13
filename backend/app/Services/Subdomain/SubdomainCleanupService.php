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

namespace App\Services\Subdomain;

use App\App;
use App\Chat\Subdomain;
use App\Chat\Allocation;
use App\Chat\SubdomainDomain;

class SubdomainCleanupService
{
    public function cleanupServerSubdomains(int $serverId): void
    {
        if ($serverId <= 0) {
            return;
        }

        $subdomains = Subdomain::getByServerId($serverId);
        if (empty($subdomains)) {
            return;
        }

        foreach ($subdomains as $entry) {
            $domain = SubdomainDomain::getDomainById((int) $entry['domain_id']);
            if (!$domain) {
                continue;
            }

            $accountId = trim((string) ($domain['cloudflare_account_id'] ?? ''));
            if ($accountId === '') {
                continue;
            }

            $service = CloudflareSubdomainService::fromConfig($accountId);

            if ($service->isAvailable() && !empty($domain['cloudflare_zone_id'])) {
                $zoneId = $domain['cloudflare_zone_id'];
                $recordId = $entry['cloudflare_record_id'] ?? null;

                $hostName = $entry['subdomain'] . '.' . $domain['domain'];

                if ($recordId) {
                    $service->deleteRecord($zoneId, $recordId);
                } else {
                    $mappings = SubdomainDomain::getSpellMappings((int) $domain['id']);
                    $protocolService = null;
                    $protocolType = 'tcp';
                    foreach ($mappings as $mapping) {
                        if ((int) $mapping['spell_id'] === (int) $entry['spell_id']) {
                            $protocolService = $mapping['protocol_service'] ?? null;
                            $protocolType = $mapping['protocol_type'] ?? 'tcp';
                            break;
                        }
                    }

                    $recordName = $entry['record_type'] === 'SRV'
                        ? (($protocolService ?? '') . '._' . $protocolType . '.' . $hostName)
                        : $hostName;

                    $service->deleteRecordByName($zoneId, $entry['record_type'], $recordName);
                }

                if ($entry['record_type'] === 'SRV') {
                    $allocations = Allocation::getByServerId((int) $entry['server_id']);
                    $allocation = $allocations[0] ?? null;
                    $ipAlias = $allocation['ip_alias'] ?? '';
                    $shouldCleanupAddress = $ipAlias === '' || filter_var($ipAlias, FILTER_VALIDATE_IP) !== false;

                    if ($shouldCleanupAddress) {
                        $service->deleteRecordByName($zoneId, 'A', $hostName);
                        $service->deleteRecordByName($zoneId, 'AAAA', $hostName);
                    }
                }
            }
        }

        if (!Subdomain::deleteByServerId($serverId)) {
            App::getInstance(true)->getLogger()->warning('Failed to delete subdomain records for server ID: ' . $serverId);
        }
    }
}
