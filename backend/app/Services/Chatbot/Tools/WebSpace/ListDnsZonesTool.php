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

use App\Chat\WebSpaceDnsZone;
use App\WebSpaceSubuserPermissions;
use App\Services\Chatbot\Tools\ToolInterface;

class ListDnsZonesTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $access = WebSpaceToolAccess::resolve($params, $user, $pageContext, WebSpaceSubuserPermissions::DNS_READ);
        if (!$access['ok']) {
            return ['success' => false, 'error' => $access['error']];
        }
        $zones = WebSpaceDnsZone::listByWebspaceId((int) $access['space']['id']);
        $out = [];
        foreach ($zones as $zone) {
            $out[] = [
                'id' => (int) ($zone['id'] ?? 0),
                'zone_name' => $zone['zone_name'] ?? null,
                'is_primary' => !empty($zone['is_primary']),
                'dns_host_id' => (int) ($zone['dns_host_id'] ?? 0),
            ];
        }

        return ['success' => true, 'zones' => $out];
    }

    public function getDescription(): string
    {
        return 'List DNS zones linked to a WebSpace.';
    }

    public function getParameters(): array
    {
        return ['uuid_short' => 'Optional WebSpace short UUID'];
    }
}
