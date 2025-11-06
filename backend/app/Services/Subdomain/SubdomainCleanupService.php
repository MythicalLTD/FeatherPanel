<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
