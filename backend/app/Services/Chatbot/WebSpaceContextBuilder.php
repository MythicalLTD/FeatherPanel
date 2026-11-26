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

namespace App\Services\Chatbot;

use App\App;
use App\Permissions;
use App\Chat\WebSpace;
use App\Chat\WebSpaceDomain;
use App\Chat\WebSpaceSubuser;
use App\Helpers\WebSpaceGateway;
use App\Helpers\PermissionHelper;

class WebSpaceContextBuilder
{
    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    public function buildContext(array $user, array $pageContext = []): string
    {
        $context = [];
        $userUuid = $user['uuid'] ?? '';
        $isAdmin = PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_ROOT)
            || PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_WEBSPACES_VIEW);

        $context[] = '## User Information';
        $context[] = "Username: {$user['username']}";
        $context[] = "User UUID: {$user['uuid']}";
        $context[] = "User ID: {$user['id']}";
        $context[] = $isAdmin ? 'Role: Administrator' : 'Role: User';

        $spaces = $this->getUserWebSpaces($user);
        $context[] = '';
        $context[] = '## User WebSpaces';
        if ($spaces === []) {
            $context[] = 'The user has no WebSpaces yet.';
        } else {
            $context[] = 'Total: ' . count($spaces);
            $context[] = '';
            foreach ($spaces as $index => $space) {
                $num = $index + 1;
                $name = $space['name'] ?? ('WebSpace #' . ($space['id'] ?? $num));
                $uuidShort = $space['uuidShort'] ?? $space['uuid_short'] ?? '';
                $context[] = "### WebSpace {$num}: {$name}";
                $context[] = "- uuid_short: {$uuidShort}";
                $context[] = '- Status: ' . ($space['status'] ?? 'unknown');
                $context[] = '- Plate: ' . ($space['webplate_name'] ?? 'n/a');
                $context[] = '';
            }
        }

        if (!empty($pageContext)) {
            $context[] = '## Current Context';
            if (isset($pageContext['route'])) {
                $context[] = "Current Route: {$pageContext['route']}";
            }
            if (isset($pageContext['webspace']) && is_array($pageContext['webspace'])) {
                $ws = $pageContext['webspace'];
                $key = (string) ($ws['uuidShort'] ?? $ws['uuid_short'] ?? $ws['uuid'] ?? '');
                if ($key !== '' && WebSpaceGateway::canUserAccessWebSpace($userUuid, $key)) {
                    $space = WebSpaceGateway::resolveWebSpace($key) ?? $ws;
                    $uuidShort = $space['uuidShort'] ?? $space['uuid_short'] ?? $key;
                    $context[] = '';
                    $context[] = '### Currently Viewing WebSpace';
                    $context[] = 'Name: ' . ($space['name'] ?? 'unknown');
                    $context[] = "uuid_short: {$uuidShort}";
                    $context[] = 'Status: ' . ($space['status'] ?? 'unknown');
                    $context[] = 'Plate: ' . ($space['webplate_name'] ?? 'n/a');
                    $domains = WebSpaceDomain::listForWebspaceId((int) ($space['id'] ?? 0));
                    if ($domains !== []) {
                        $names = array_values(array_filter(array_map(static fn ($d) => $d['domain'], $domains)));
                        if ($names !== []) {
                            $context[] = 'Domains: ' . implode(', ', $names);
                        }
                    }
                }
            }
        }

        return implode("\n", $context);
    }

    public static function loadSystemPrompt(): string
    {
        $promptFile = __DIR__ . '/webspace-system-prompt.txt';
        if (file_exists($promptFile)) {
            return trim((string) file_get_contents($promptFile));
        }

        return 'You are FeatherPanel WebSpace AI, an assistant for web hosting: DNS, WAF, SSL, deploys, backups and files.';
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function getUserWebSpaces(array $user): array
    {
        try {
            $userId = (int) ($user['id'] ?? 0);
            $owned = $userId > 0 ? WebSpace::listByOwnerId($userId) : [];
            $subIds = $userId > 0 ? WebSpaceSubuser::listWebSpaceIdsByUserId($userId) : [];
            $fromSub = $subIds !== [] ? WebSpace::listByIds($subIds) : [];
            $byId = [];
            foreach (array_merge($owned, $fromSub) as $space) {
                $id = (int) ($space['id'] ?? 0);
                if ($id > 0) {
                    $byId[$id] = $space;
                }
            }

            return array_slice(array_values($byId), 0, 8);
        } catch (\Exception $e) {
            $this->app->getLogger()->error('WebSpaceContextBuilder: Failed to list WebSpaces: ' . $e->getMessage());

            return [];
        }
    }
}
