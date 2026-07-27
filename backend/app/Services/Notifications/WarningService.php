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

namespace App\Services\Notifications;

use App\App;
use App\Chat\User;
use App\Chat\Server;
use App\Chat\Notification;
use App\Chat\ServerActivity;
use App\Config\ConfigInterface;
use App\Mail\templates\UserWarning;
use App\CloudFlare\CloudFlareRealIP;

/**
 * Create targeted in-panel warnings (and optional email) for users / servers.
 */
class WarningService
{
    /**
     * Create a warning notification optionally scoped to a user and/or server.
     *
     * @param array{
     *     title: string,
     *     message_markdown: string,
     *     type?: string,
     *     user_id?: int|null,
     *     server_id?: int|null,
     *     is_dismissible?: bool,
     *     is_sticky?: bool,
     *     send_email?: bool,
     *     actor_uuid?: string|null
     * } $options
     *
     * @return array{notification_id: int, emailed: bool}|false
     */
    public static function send(array $options): array | false
    {
        $title = trim((string) ($options['title'] ?? ''));
        $message = trim((string) ($options['message_markdown'] ?? ''));
        $type = $options['type'] ?? 'warning';
        $userId = isset($options['user_id']) ? (int) $options['user_id'] : null;
        $serverId = isset($options['server_id']) ? (int) $options['server_id'] : null;
        $sendEmail = (bool) ($options['send_email'] ?? false);
        $isDismissible = array_key_exists('is_dismissible', $options) ? (bool) $options['is_dismissible'] : true;
        $isSticky = array_key_exists('is_sticky', $options) ? (bool) $options['is_sticky'] : false;

        if ($title === '' || $message === '') {
            App::getInstance(true)->getLogger()->error('WarningService: title and message_markdown are required');

            return false;
        }

        $validTypes = ['info', 'warning', 'danger', 'success', 'error'];
        if (!in_array($type, $validTypes, true)) {
            App::getInstance(true)->getLogger()->error('WarningService: invalid type ' . $type);

            return false;
        }

        $server = null;
        if ($serverId !== null && $serverId > 0) {
            $server = Server::getServerById($serverId);
            if (!$server) {
                App::getInstance(true)->getLogger()->error('WarningService: invalid server_id ' . $serverId);

                return false;
            }

            // Server-scoped warnings always belong to the server owner.
            if ($userId === null || $userId <= 0) {
                $userId = (int) $server['owner_id'];
            } elseif ((int) $server['owner_id'] !== $userId) {
                App::getInstance(true)->getLogger()->error('WarningService: user_id does not own server_id');

                return false;
            }
        } else {
            $serverId = null;
        }

        if ($userId !== null && $userId > 0) {
            if (!User::getUserById($userId)) {
                App::getInstance(true)->getLogger()->error('WarningService: invalid user_id ' . $userId);

                return false;
            }
        } else {
            $userId = null;
            // Global announcements cannot be emailed to a single recipient.
            $sendEmail = false;
        }

        $payload = [
            'title' => $title,
            'message_markdown' => $message,
            'type' => $type,
            'is_dismissible' => $isDismissible,
            'is_sticky' => $isSticky,
            'user_id' => $userId,
            'server_id' => $serverId,
        ];

        $notificationId = Notification::createNotification($payload);
        if (!$notificationId) {
            return false;
        }

        $emailed = false;
        if ($sendEmail && $userId !== null) {
            $emailed = self::sendWarningEmail($userId, $title, $message, $server);
        }

        if ($server !== null) {
            try {
                ServerActivity::createActivity([
                    'server_id' => (int) $server['id'],
                    'node_id' => (int) $server['node_id'],
                    'user_id' => $userId,
                    'event' => 'server:warning.sent',
                    'metadata' => json_encode([
                        'notification_id' => $notificationId,
                        'title' => $title,
                        'type' => $type,
                        'emailed' => $emailed,
                        'actor_uuid' => $options['actor_uuid'] ?? null,
                    ]),
                    'ip_address' => CloudFlareRealIP::getRealIP(),
                ]);
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->warning(
                    'WarningService: failed to log server activity: ' . $e->getMessage()
                );
            }
        }

        return [
            'notification_id' => $notificationId,
            'emailed' => $emailed,
        ];
    }

    /**
     * Email the warning to the target user.
     */
    private static function sendWarningEmail(int $userId, string $title, string $message, ?array $server): bool
    {
        $user = User::getUserById($userId);
        if (!$user) {
            return false;
        }

        try {
            $config = App::getInstance(true)->getConfig();
            $appUrl = $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems');
            $actionUrl = $appUrl . '/dashboard';
            if ($server && !empty($server['uuidShort'])) {
                $actionUrl = $appUrl . '/server/' . $server['uuidShort'];
            }

            // Strip basic markdown for the email body preview.
            $plainMessage = trim(strip_tags(str_replace(["\r\n", "\r"], "\n", $message)));

            UserWarning::send([
                'email' => $user['email'],
                'subject' => 'Warning from ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_url' => $appUrl,
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'username' => $user['username'],
                'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
                'uuid' => $user['uuid'],
                'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
                'warning_title' => $title,
                'warning_message' => $plainMessage,
                'server_name' => $server['name'] ?? '',
                'action_url' => $actionUrl,
            ]);

            return true;
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('WarningService: failed to send email: ' . $e->getMessage());

            return false;
        }
    }
}
