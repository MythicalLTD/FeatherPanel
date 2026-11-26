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

namespace App\Services\Chatbot\Tools\WebSpace;

use App\Chat\DnsHost;
use App\Chat\WebSpaceDnsZone;
use App\WebSpaceSubuserPermissions;
use App\Services\Chatbot\Tools\ToolInterface;

class ListDnsRecordsTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $access = WebSpaceToolAccess::resolve($params, $user, $pageContext, WebSpaceSubuserPermissions::DNS_READ);
        if (!$access['ok']) {
            return ['success' => false, 'error' => $access['error']];
        }
        $zoneId = (int) ($params['zone_id'] ?? 0);
        if ($zoneId <= 0) {
            return ['success' => false, 'error' => 'zone_id is required.'];
        }
        $zone = WebSpaceDnsZone::getById($zoneId);
        if (!$zone || (int) ($zone['webspace_id'] ?? 0) !== (int) $access['space']['id']) {
            return ['success' => false, 'error' => 'Zone not found on this WebSpace.'];
        }
        $host = DnsHost::getById((int) ($zone['dns_host_id'] ?? 0));
        if (!$host) {
            return ['success' => false, 'error' => 'DNS host not found.'];
        }
        $provider = DnsHost::createProvider($host);
        if ($provider === null) {
            return ['success' => false, 'error' => 'DNS provider is not configured.'];
        }
        try {
            $records = $provider->listRecords((string) ($zone['provider_zone_id'] ?? ''));
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'Failed to list records: ' . $e->getMessage()];
        }
        $safe = [];
        foreach ($records['records'] as $record) {
            $safe[] = [
                'id' => $record['id'] ?? null,
                'type' => $record['type'] ?? null,
                'name' => $record['name'] ?? null,
                'content' => $record['content'] ?? $record['value'] ?? null,
                'ttl' => $record['ttl'] ?? null,
            ];
        }

        return ['success' => true, 'zone' => $zone['zone_name'] ?? null, 'records' => $safe];
    }

    public function getDescription(): string
    {
        return 'List DNS records for a linked zone (from the DNS provider).';
    }

    public function getParameters(): array
    {
        return ['uuid_short' => 'Optional WebSpace short UUID', 'zone_id' => 'DNS zone id from list_dns_zones'];
    }
}
