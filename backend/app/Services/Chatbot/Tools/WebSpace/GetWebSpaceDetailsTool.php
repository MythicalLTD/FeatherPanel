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

use App\Services\Chatbot\Tools\ToolInterface;

class GetWebSpaceDetailsTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $access = WebSpaceToolAccess::resolve($params, $user, $pageContext);
        if (!$access['ok']) {
            return ['success' => false, 'error' => $access['error']];
        }
        $space = $access['space'];
        $domains = \App\Chat\WebSpaceDomain::listForWebspaceId((int) ($space['id'] ?? 0));
        $domainNames = array_values(array_filter(array_map(static fn ($d) => $d['domain'] ?? null, $domains)));

        return [
            'success' => true,
            'webspace' => [
                'uuid_short' => $access['uuidShort'],
                'name' => $space['name'] ?? null,
                'status' => $space['status'] ?? null,
                'domains' => $domainNames,
                'webplate' => $space['webplate_name'] ?? null,
                'runtime' => $space['webplate_runtime'] ?? null,
                'web_node' => $space['web_node_name'] ?? null,
                'disk_mb' => isset($space['disk']) ? (int) $space['disk'] : null,
                'ssl_enabled' => !empty($space['ssl_enabled']),
                'dns_status' => $space['dns_status'] ?? null,
            ],
        ];
    }

    public function getDescription(): string
    {
        return 'Get details about a WebSpace (name, domains, status, plate, disk).';
    }

    public function getParameters(): array
    {
        return ['uuid_short' => 'Optional WebSpace short UUID when not on a WebSpace page'];
    }
}
