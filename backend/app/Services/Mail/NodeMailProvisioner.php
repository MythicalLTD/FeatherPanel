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

namespace App\Services\Mail;

use App\Chat\WebNode;
use App\Helpers\FeatherQuilldClient;

/**
 * Provisions mailboxes on a FeatherQuilld web node (docker-mailserver).
 */
class NodeMailProvisioner
{
    /**
     * @param array<string, mixed> $mailHost
     * @param array<string, mixed> $payload
     */
    public static function dispatch(array $mailHost, string $action, array $payload): void
    {
        $webNodeId = (int) ($mailHost['web_node_id'] ?? 0);
        if ($webNodeId <= 0) {
            throw new \InvalidArgumentException('Node mail host requires web_node_id');
        }

        $webNode = WebNode::getWebNodeById($webNodeId);
        if (!$webNode) {
            throw new \RuntimeException('Web node not found for mail host');
        }

        $body = array_merge(['action' => $action], $payload);
        $result = FeatherQuilldClient::mailProvision($webNode, $body);
        if (!$result['ok']) {
            $detail = is_array($result['body']) ? ($result['body']['error'] ?? null) : null;
            $message = is_string($detail) && $detail !== ''
                ? $detail
                : ($result['error'] ?? 'Mail provision failed');

            throw new \RuntimeException($message);
        }
    }
}
