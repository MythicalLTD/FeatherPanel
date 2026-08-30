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

namespace App\Controllers\User\WebSpaces;

use App\Chat\WebNode;
use App\Helpers\ApiResponse;
use App\Helpers\WebSpaceGateway;
use App\WebSpaceSubuserPermissions;
use App\Helpers\FeatherQuilldClient;
use App\Helpers\WebSpaceActivityLogger;
use App\Helpers\CheckWebSpacePermission;
use App\Helpers\WebSpaceWordPressInstaller;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WebSpaceAppsController
{
    public function installWordPress(Request $request, string $uuidShort): Response
    {
        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::FILE_CREATE);
        if ($denied instanceof Response) {
            return $denied;
        }
        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::DATABASE_CREATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            $content = [];
        }

        try {
            $result = WebSpaceWordPressInstaller::install($space, $webNode, $content);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 'WORDPRESS_VALIDATION_FAILED', 400);
        } catch (\Throwable $e) {
            return ApiResponse::error($e->getMessage(), 'WORDPRESS_INSTALL_FAILED', 502);
        }

        $user = $request->attributes->get('user');
        WebSpaceActivityLogger::log(
            $space,
            is_array($user) ? $user : null,
            'wordpress.install',
            [
                'directory' => $result['directory'] ?? '/',
                'database' => $result['database'] ?? null,
            ],
        );

        return ApiResponse::success($result, 'WordPress installed', 200);
    }

    public function updateWordPress(Request $request, string $uuidShort): Response
    {
        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::FILE_CREATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            $content = [];
        }

        try {
            $result = WebSpaceWordPressInstaller::update($space, $webNode, $content);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 'WORDPRESS_VALIDATION_FAILED', 400);
        } catch (\Throwable $e) {
            return ApiResponse::error($e->getMessage(), 'WORDPRESS_UPDATE_FAILED', 502);
        }

        $user = $request->attributes->get('user');
        WebSpaceActivityLogger::log(
            $space,
            is_array($user) ? $user : null,
            'wordpress.update',
            ['directory' => $result['directory'] ?? '/'],
        );

        return ApiResponse::success($result, 'WordPress updated', 200);
    }

    public function stagingWordPress(Request $request, string $uuidShort): Response
    {
        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::FILE_CREATE);
        if ($denied instanceof Response) {
            return $denied;
        }
        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::DATABASE_CREATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            $content = [];
        }

        try {
            $result = WebSpaceWordPressInstaller::staging($space, $webNode, $content);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 'WORDPRESS_VALIDATION_FAILED', 400);
        } catch (\Throwable $e) {
            return ApiResponse::error($e->getMessage(), 'WORDPRESS_STAGING_FAILED', 502);
        }

        $user = $request->attributes->get('user');
        WebSpaceActivityLogger::log(
            $space,
            is_array($user) ? $user : null,
            'wordpress.staging',
            [
                'directory' => $result['directory'] ?? '/staging',
                'database' => $result['database'] ?? null,
            ],
        );

        return ApiResponse::success($result, 'WordPress staging created', 200);
    }

    public function installWordPressPlugin(Request $request, string $uuidShort): Response
    {
        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::FILE_CREATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            $content = [];
        }

        try {
            $result = WebSpaceWordPressInstaller::installPlugin($space, $webNode, $content);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 'WORDPRESS_VALIDATION_FAILED', 400);
        } catch (\Throwable $e) {
            return ApiResponse::error($e->getMessage(), 'WORDPRESS_PLUGIN_FAILED', 502);
        }

        $user = $request->attributes->get('user');
        WebSpaceActivityLogger::log(
            $space,
            is_array($user) ? $user : null,
            'wordpress.plugin_install',
            ['slug' => $result['slug'] ?? null, 'directory' => $result['directory'] ?? '/'],
        );

        return ApiResponse::success($result, 'Plugin installed', 200);
    }

    public function enableWordPressAutoUpdate(Request $request, string $uuidShort): Response
    {
        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::SCHEDULE_CREATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            $content = [];
        }
        $directory = (string) ($content['directory'] ?? '/');
        $command = WebSpaceWordPressInstaller::buildUpdateCommand($directory);

        $scheduleId = \App\Chat\WebSpaceSchedule::create([
            'webspace_id' => (int) $space['id'],
            'name' => 'WordPress auto-update',
            'cron_day_of_week' => '0',
            'cron_month' => '*',
            'cron_day_of_month' => '*',
            'cron_hour' => '4',
            'cron_minute' => '0',
            'timezone' => 'UTC',
            'is_active' => 1,
        ]);
        if ($scheduleId === false) {
            return ApiResponse::error('Failed to create auto-update schedule', 'CREATION_FAILED', 500);
        }

        $tasks = [[
            'action' => 'command',
            'payload' => $command,
            'sequence_id' => 1,
            'time_offset' => 0,
            'continue_on_failure' => false,
        ]];
        if (!\App\Chat\WebSpaceSchedule::replaceTasks($scheduleId, $tasks)) {
            \App\Chat\WebSpaceSchedule::delete($scheduleId);

            return ApiResponse::error('Failed to create schedule tasks', 'TASK_CREATION_FAILED', 500);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if ($webNode) {
            FeatherQuilldClient::syncWebSpaceSchedules($webNode, (string) $space['uuid']);
        }

        $user = $request->attributes->get('user');
        WebSpaceActivityLogger::log(
            $space,
            is_array($user) ? $user : null,
            'wordpress.auto_update_enabled',
            ['schedule_id' => $scheduleId, 'directory' => $directory],
        );

        return ApiResponse::success([
            'schedule_id' => $scheduleId,
            'cron' => '0 4 * * 0',
            'directory' => $directory,
        ], 'Weekly WordPress auto-update scheduled', 200);
    }

    public function gitDeploy(Request $request, string $uuidShort): Response
    {
        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::FILE_CREATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            $content = [];
        }

        try {
            $result = \App\Helpers\WebSpaceGitDeployer::deploy($space, $webNode, $content);
            if (!empty($content['save_webhook'])) {
                \App\Helpers\WebSpaceGitDeployer::saveWebhookConfig($space, $webNode, $content);
            }
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 'GIT_VALIDATION_FAILED', 400);
        } catch (\Throwable $e) {
            return ApiResponse::error($e->getMessage(), 'GIT_DEPLOY_FAILED', 502);
        }

        $user = $request->attributes->get('user');
        WebSpaceActivityLogger::log(
            $space,
            is_array($user) ? $user : null,
            'git.deploy',
            [
                'directory' => $result['directory'] ?? '/',
                'ref' => $result['ref'] ?? null,
            ],
        );

        return ApiResponse::success($result, 'Git deploy complete', 200);
    }

    public function gitWebhookConfig(Request $request, string $uuidShort): Response
    {
        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::SETTINGS_READ);
        if ($denied instanceof Response) {
            return $denied;
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $config = \App\Helpers\WebSpaceGitDeployer::loadWebhookConfig($space, $webNode);
        $app = \App\App::getInstance(true);
        $appUrl = rtrim((string) $app->getConfig()->getSetting('APP_URL', ''), '/');
        $uuid = (string) $space['uuid'];

        return ApiResponse::success([
            'config' => $config,
            'webhook_url' => $appUrl . '/api/webhooks/webspaces/' . $uuid . '/git-deploy',
        ], 'OK', 200);
    }

    public function saveGitWebhookConfig(Request $request, string $uuidShort): Response
    {
        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::FILE_CREATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON', 'INVALID_JSON', 400);
        }

        try {
            $config = \App\Helpers\WebSpaceGitDeployer::saveWebhookConfig($space, $webNode, $content);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 'GIT_VALIDATION_FAILED', 400);
        } catch (\Throwable $e) {
            return ApiResponse::error($e->getMessage(), 'GIT_WEBHOOK_SAVE_FAILED', 502);
        }

        $app = \App\App::getInstance(true);
        $appUrl = rtrim((string) $app->getConfig()->getSetting('APP_URL', ''), '/');

        return ApiResponse::success([
            'config' => $config,
            'webhook_url' => $appUrl . '/api/webhooks/webspaces/' . $space['uuid'] . '/git-deploy',
        ], 'Git webhook saved', 200);
    }

    public function gitDeployKey(Request $request, string $uuidShort): Response
    {
        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::SETTINGS_READ);
        if ($denied instanceof Response) {
            return $denied;
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $public = \App\Helpers\WebSpaceGitDeployer::loadDeployKeyPublic($space, $webNode);

        return ApiResponse::success([
            'public_key' => $public,
            'has_key' => $public !== '',
        ], 'OK', 200);
    }

    public function regenerateGitDeployKey(Request $request, string $uuidShort): Response
    {
        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::FILE_CREATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        try {
            $result = \App\Helpers\WebSpaceGitDeployer::ensureDeployKey($space, $webNode, regenerate: true);
        } catch (\Throwable $e) {
            return ApiResponse::error($e->getMessage(), 'GIT_KEY_FAILED', 502);
        }

        $user = $request->attributes->get('user');
        WebSpaceActivityLogger::log(
            $space,
            is_array($user) ? $user : null,
            'git.deploy_key.regenerated',
            ['created' => $result['created']],
        );

        return ApiResponse::success($result, 'Deploy key regenerated', 200);
    }
}
