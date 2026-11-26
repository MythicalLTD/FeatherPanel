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

use App\WebSpaceSubuserPermissions;
use App\Helpers\WebSpaceGitDeployer;
use App\Services\Chatbot\Tools\ToolInterface;

class GetAppDeployConfigTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $access = WebSpaceToolAccess::resolve($params, $user, $pageContext, WebSpaceSubuserPermissions::SETTINGS_READ);
        if (!$access['ok']) {
            return ['success' => false, 'error' => $access['error']];
        }
        if (!$access['webNode']) {
            return ['success' => false, 'error' => 'Web node not found.'];
        }
        $config = WebSpaceGitDeployer::loadWebhookConfig($access['space'], $access['webNode']);
        if (is_array($config)) {
            unset($config['secret'], $config['token'], $config['private_key'], $config['deploy_key_private']);
        }
        $app = \App\App::getInstance(true);
        $appUrl = rtrim((string) $app->getConfig()->getSetting(\App\Config\ConfigInterface::APP_URL, ''), '/');

        return [
            'success' => true,
            'config' => $config,
            'webhook_url' => $appUrl . '/api/webhooks/webspaces/' . $access['uuid'] . '/git-deploy',
            'webplate' => $access['space']['webplate_name'] ?? null,
        ];
    }

    public function getDescription(): string
    {
        return 'Get git deploy webhook config metadata (no secrets) and public key if present.';
    }

    public function getParameters(): array
    {
        return ['uuid_short' => 'Optional WebSpace short UUID'];
    }
}
